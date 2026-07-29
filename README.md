# Watercooler

Watercooler pairs coworkers for coffee chats based on what they actually care
about. Profiles are embedded with a sentence-transformer model and compared by
cosine similarity in Postgres, so people are matched on meaning rather than on
overlapping keywords or who happens to sit nearby.

Originally a 2022 hackathon project; this is a full rewrite.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Database | Supabase Postgres + `pgvector`, RLS on every table |
| Auth | Supabase Auth (email + password) |
| Realtime | Supabase Realtime (messages, notifications, chats) |
| Embeddings | Hugging Face Inference API — `sentence-transformers/all-MiniLM-L6-v2` (384-dim) |
| Styling | Tailwind v4 + shadcn (base-ui), Geist Sans / Geist Mono |

## Setup

```bash
npm install
cp .env.example .env.local     # then fill in the values
```

`.env.local` needs:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
HF_TOKEN=hf_...                # server-only, never NEXT_PUBLIC_
```

Apply the schema and seed demo people:

```bash
export DATABASE_URL='postgresql://postgres:<password>@db.<project>.supabase.co:5432/postgres'
npm run db:migrate
npm run db:seed                # 12 demo profiles, real embeddings
npm run dev
```

The seed creates 12 demo accounts (`*@watercooler.demo`), all with the password
`watercooler2026`, so you can sign in as different people and exercise matching,
requests, and messaging from both sides.

Without `HF_TOKEN` the app still runs — matching degrades to shared-interest
overlap and the UI says so.

## How matching works

1. On profile save, the free-text fields (`bio`, `working_on`, `curious_about`,
   `fun_fact`, `headline`, `department`, `location`) plus the user's interests
   are flattened into a single labelled string by `buildProfileText()`.
2. That string is embedded via the HF Inference API and stored in
   `profiles.embedding` (`vector(384)`, HNSW index, cosine ops).
3. `syncProfileEmbedding()` compares the newly-built string against the stored
   `embedding_source` and skips the API call when nothing meaningful changed.
4. The `match_profiles()` RPC ranks candidates next to the index, blending
   **82% calibrated semantic similarity** with **18% shared-interest overlap**.

### Score calibration

MiniLM does not use the full cosine range on prose like this. Measured across
every pair in the seed set:

```
min 0.185 | p05 0.300 | p50 0.456 | p95 0.586 | max 0.619
```

Showing raw cosine meant a *best possible* match displayed as "62%", with
everything bunched into an undifferentiated 40–60% band. `0002_calibrate_match_scoring.sql`
stretches the band the model actually uses onto `[0.15, 0.95]` before blending in
the interest bonus. Ordering is unchanged; the number is just honest now. The
floor and ceiling are deliberate — nothing reads as 0% or 100%.

## Layout

```
src/
  app/
    (auth)/          login, signup
    (app)/           signed-in shell: discover, people, chats, profile, settings, notifications
    onboarding/      multi-step wizard that feeds the embedding model
    auth/            callback + signout routes
    page.tsx         marketing landing
  components/
    kit/             shared primitives (avatar, score badge, empty state, …)
    shell/           nav, logo, theme toggle
    ui/              shadcn (base-ui) primitives
  lib/
    embeddings.ts    HF client + profile text builder
    matching.ts      embedding sync, match queries, explanations
    session.ts       auth + onboarding gates
    types.ts         row shapes, mirrors the SQL
  proxy.ts           session refresh + route guards (Next 16 renamed middleware → proxy)
supabase/
  migrations/        applied in filename order
  seed/              demo personas + seed script
docs/DESIGN.md       design system and build conventions — read before writing UI
```

## Notes

- `docs/DESIGN.md` is the source of truth for visual conventions.
- Notification rows are written by database triggers; never insert them from
  application code.
- `messages` inserts are rejected by RLS unless the parent chat is `accepted`.
