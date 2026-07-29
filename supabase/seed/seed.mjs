#!/usr/bin/env node
/**
 * Seeds demo people so discovery and matching have something real to rank.
 *
 *   DATABASE_URL=postgresql://... HF_TOKEN=hf_... node supabase/seed/seed.mjs
 *
 * Steps:
 *   1. Create confirmed auth users (idempotent — existing emails are reused).
 *   2. Fill in their profiles and interests.
 *   3. Backfill a profile row for any auth user missing one.
 *   4. Embed every profile via the Hugging Face Inference API and store the
 *      vectors, so `match_profiles` returns genuine semantic rankings.
 *
 * Shells out to `psql` rather than taking a Postgres driver dependency the app
 * itself doesn't need.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DEMO_PASSWORD = 'watercooler2026'
const MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_URL = `https://router.huggingface.co/hf-inference/models/${MODEL}/pipeline/feature-extraction`

const DATABASE_URL = process.env.DATABASE_URL
const HF_TOKEN = process.env.HF_TOKEN

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

const scratch = mkdtempSync(join(tmpdir(), 'wc-seed-'))

/** Runs SQL through psql, failing loudly on the first error. */
function sql(text, { quiet = false } = {}) {
  const file = join(scratch, `q-${Date.now()}-${Math.random().toString(36).slice(2)}.sql`)
  writeFileSync(file, text)
  const out = execFileSync(
    'psql',
    [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '--no-psqlrc', '-t', '-A', '-F', '\t', '-f', file],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  )
  if (!quiet && out.trim()) console.log(out.trim())
  return out
}

/** Postgres string literal. */
const lit = (v) =>
  v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`

const personas = JSON.parse(readFileSync(join(HERE, 'personas.json'), 'utf8'))

// ---------------------------------------------------------------------------
// 1. Auth users
//
// Inserting into auth.users directly is the documented way to seed Supabase
// without a service-role key. An `auth.identities` row is required too,
// otherwise email/password sign-in won't find the account.
// ---------------------------------------------------------------------------
console.log(`Creating ${personas.length} demo auth users…`)

const userStatements = personas
  .map((p) => {
    const email = lit(p.email)
    // auth.users has only a *partial* unique index on email (where is_sso_user
    // is false), so ON CONFLICT can't target it. Guard with NOT EXISTS instead.
    return `
with new_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  select
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    ${email}, extensions.crypt(${lit(DEMO_PASSWORD)}, extensions.gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', ${lit(p.full_name)}),
    now(), now()
  where not exists (select 1 from auth.users where email = ${email})
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), nu.id, nu.id::text,
       jsonb_build_object('sub', nu.id::text, 'email', nu.email, 'email_verified', true),
       'email', now(), now(), now()
from new_user nu
on conflict do nothing;`
  })
  .join('\n')

sql(userStatements, { quiet: true })

// ---------------------------------------------------------------------------
// 2. Profiles + interests
//
// The on_auth_user_created trigger already made a bare profile row; this fills
// in everything the matching model actually reads.
// ---------------------------------------------------------------------------
console.log('Filling in profiles and interests…')

const profileStatements = personas
  .map((p) => {
    const slugs = p.interests.map((s) => lit(s)).join(', ')
    return `
update public.profiles p set
  full_name = ${lit(p.full_name)},
  headline = ${lit(p.headline)},
  department = ${lit(p.department)},
  location = ${lit(p.location)},
  timezone = ${lit(p.timezone)},
  pronouns = ${lit(p.pronouns)},
  bio = ${lit(p.bio)},
  working_on = ${lit(p.working_on)},
  curious_about = ${lit(p.curious_about)},
  fun_fact = ${lit(p.fun_fact)},
  chat_preference = ${lit(p.chat_preference)},
  open_to_matching = true,
  onboarding_completed = true
from auth.users u
where u.id = p.id and u.email = ${lit(p.email)};

delete from public.user_interests
where user_id = (select id from auth.users where email = ${lit(p.email)});

insert into public.user_interests (user_id, interest_id)
select u.id, i.id
from auth.users u
cross join public.interests i
where u.email = ${lit(p.email)} and i.slug in (${slugs})
on conflict do nothing;`
  })
  .join('\n')

sql(profileStatements, { quiet: true })

// ---------------------------------------------------------------------------
// 3. Backfill profiles for any real accounts created before the schema reset.
//    They land at onboarding_completed = false so they run the wizard.
// ---------------------------------------------------------------------------
sql(
  `insert into public.profiles (id, full_name)
   select u.id, nullif(trim(coalesce(u.raw_user_meta_data->>'full_name','')), '')
   from auth.users u
   left join public.profiles p on p.id = u.id
   where p.id is null
   on conflict (id) do nothing;`,
  { quiet: true }
)

// ---------------------------------------------------------------------------
// 4. Embeddings
//
// Mirrors buildProfileText() in src/lib/embeddings.ts exactly. If the two ever
// drift, seeded vectors stop being comparable to ones the app generates.
// ---------------------------------------------------------------------------
if (!HF_TOKEN) {
  console.warn('\nHF_TOKEN not set — skipping embeddings. Matching will fall back to interest overlap.')
  process.exit(0)
}

console.log('Building embedding source text…')

const rows = sql(
  `select p.id,
          coalesce(p.headline,''), coalesce(p.department,''), coalesce(p.location,''),
          coalesce(p.bio,''), coalesce(p.working_on,''), coalesce(p.curious_about,''),
          coalesce(p.fun_fact,''),
          coalesce((select string_agg(i.name, '|' order by i.name)
                    from public.user_interests ui
                    join public.interests i on i.id = ui.interest_id
                    where ui.user_id = p.id), '')
   from public.profiles p
   where p.onboarding_completed;`,
  { quiet: true }
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [id, headline, department, location, bio, working_on, curious_about, fun_fact, interests] =
      line.split('\t')
    return {
      id,
      text: buildProfileText({
        headline,
        department,
        location,
        bio,
        working_on,
        curious_about,
        fun_fact,
        interests: interests ? interests.split('|') : [],
      }),
    }
  })
  .filter((r) => r.text)

/** Keep in sync with buildProfileText() in src/lib/embeddings.ts. */
function buildProfileText(input) {
  const parts = []
  if (input.headline) parts.push(`Role: ${input.headline}`)
  if (input.department) parts.push(`Team: ${input.department}`)
  if (input.location) parts.push(`Based in ${input.location}`)
  if (input.bio) parts.push(`About: ${input.bio}`)
  if (input.working_on) parts.push(`Currently working on: ${input.working_on}`)
  if (input.curious_about) parts.push(`Curious about: ${input.curious_about}`)
  if (input.fun_fact) parts.push(`Fun fact: ${input.fun_fact}`)
  if (input.interests?.length) parts.push(`Interested in: ${[...input.interests].sort().join(', ')}`)
  return parts.join('. ').replace(/\s+/g, ' ').trim()
}

console.log(`Embedding ${rows.length} profiles via ${MODEL}…`)

const response = await fetch(HF_URL, {
  method: 'POST',
  headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ inputs: rows.map((r) => r.text), options: { wait_for_model: true } }),
})

if (!response.ok) {
  console.error(`Hugging Face returned ${response.status}: ${await response.text()}`)
  process.exit(1)
}

const vectors = await response.json()
if (vectors.length !== rows.length) {
  console.error(`Expected ${rows.length} vectors, got ${vectors.length}.`)
  process.exit(1)
}

const embedStatements = rows
  .map((row, i) => {
    const vec = vectors[i]
    if (!Array.isArray(vec) || vec.length !== 384) {
      throw new Error(`Bad vector for ${row.id}: length ${vec?.length}`)
    }
    return `update public.profiles set
      embedding = ${lit(`[${vec.join(',')}]`)}::vector,
      embedding_source = ${lit(row.text)},
      embedding_updated_at = now()
    where id = ${lit(row.id)};`
  })
  .join('\n')

sql(embedStatements, { quiet: true })

console.log(`\nSeeded ${personas.length} demo people. Password for all: ${DEMO_PASSWORD}`)
sql(`select count(*) filter (where embedding is not null) || ' of ' || count(*) || ' profiles embedded'
     from public.profiles where onboarding_completed;`)
