-- ============================================================================
-- Watercooler — core schema (full reset)
--
-- Replaces the original profiles/interests/coffee_chats schema. Adds:
--   * pgvector semantic matching on profiles (384-dim, all-MiniLM-L6-v2)
--   * real 1:1 messaging threads
--   * time proposals + weekly availability
--   * an in-app notification feed driven by triggers
--
-- Safe to re-run: everything is dropped and recreated.
-- ============================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Teardown (children first)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.notifications cascade;
drop table if exists public.messages cascade;
drop table if exists public.chat_time_proposals cascade;
drop table if exists public.coffee_chats cascade;
drop table if exists public.availability_slots cascade;
drop table if exists public.user_interests cascade;
drop table if exists public.interests cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.match_profiles(uuid, int, float) cascade;
drop function if exists public.set_updated_at() cascade;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
--
-- `embedding` is derived from the profile's free text (bio + role + interests
-- + conversation prompts) by the Hugging Face all-MiniLM-L6-v2 model. It is
-- written server-side only; clients never set it directly.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  headline              text,                     -- "Staff Design Engineer"
  department            text,                     -- "Design", "Engineering", ...
  location              text,                     -- "Toronto, ON"
  timezone              text default 'UTC',
  pronouns              text,
  bio                   text,
  avatar_url            text,

  -- Free-text prompts. These carry most of the matching signal.
  working_on            text,                     -- "what are you working on?"
  curious_about         text,                     -- "what do you want to learn?"
  fun_fact              text,

  -- Matching preferences
  chat_preference       text default 'either'
                          check (chat_preference in ('virtual', 'in_person', 'either')),
  open_to_matching      boolean not null default true,

  -- Semantic index
  embedding             vector(384),
  embedding_source      text,                     -- exact text that was embedded
  embedding_updated_at  timestamptz,

  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index profiles_embedding_idx
  on public.profiles using hnsw (embedding vector_cosine_ops);
create index profiles_open_to_matching_idx
  on public.profiles (open_to_matching) where open_to_matching;
create index profiles_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users insert own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "users update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- interests (curated taxonomy, grouped by category)
-- ---------------------------------------------------------------------------
create table public.interests (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name      text not null,
  category  text not null,   -- 'craft' | 'topic' | 'hobby' | 'lifestyle'
  emoji     text
);

create index interests_category_idx on public.interests (category);

alter table public.interests enable row level security;

create policy "interests readable by everyone"
  on public.interests for select
  using (true);

-- ---------------------------------------------------------------------------
-- user_interests
-- ---------------------------------------------------------------------------
create table public.user_interests (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  interest_id uuid not null references public.interests(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, interest_id)
);

create index user_interests_interest_idx on public.user_interests (interest_id);

alter table public.user_interests enable row level security;

create policy "user interests readable by authenticated users"
  on public.user_interests for select
  to authenticated
  using (true);

create policy "users insert own interests"
  on public.user_interests for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "users delete own interests"
  on public.user_interests for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- availability_slots — recurring weekly windows, stored in UTC minutes
-- weekday: 0 = Sunday ... 6 = Saturday
-- ---------------------------------------------------------------------------
create table public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  start_minute  smallint not null check (start_minute between 0 and 1439),
  end_minute    smallint not null check (end_minute between 1 and 1440),
  created_at    timestamptz not null default now(),
  constraint availability_window_valid check (end_minute > start_minute),
  unique (user_id, weekday, start_minute, end_minute)
);

create index availability_user_idx on public.availability_slots (user_id);

alter table public.availability_slots enable row level security;

create policy "availability readable by authenticated users"
  on public.availability_slots for select
  to authenticated
  using (true);

create policy "users manage own availability"
  on public.availability_slots for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- coffee_chats
-- ---------------------------------------------------------------------------
create table public.coffee_chats (
  id               uuid primary key default gen_random_uuid(),
  initiator_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id     uuid not null references public.profiles(id) on delete cascade,
  status           text not null default 'pending'
                     check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  message          text,
  -- Snapshot of the semantic score at request time, so the UI can show why
  -- these two were paired even after either profile changes.
  match_score      real,
  match_reasons    text[],
  scheduled_at     timestamptz,
  duration_minutes smallint default 30,
  location_kind    text default 'virtual' check (location_kind in ('virtual', 'in_person')),
  location_detail  text,
  responded_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint no_self_chat check (initiator_id <> recipient_id)
);

create index coffee_chats_recipient_idx on public.coffee_chats (recipient_id, status);
create index coffee_chats_initiator_idx on public.coffee_chats (initiator_id, status);
create index coffee_chats_scheduled_idx on public.coffee_chats (scheduled_at)
  where scheduled_at is not null;

-- At most one live request between a given pair, in a given direction.
create unique index coffee_chats_one_open_per_pair
  on public.coffee_chats (initiator_id, recipient_id)
  where status in ('pending', 'accepted');

create trigger coffee_chats_set_updated_at
  before update on public.coffee_chats
  for each row execute function public.set_updated_at();

alter table public.coffee_chats enable row level security;

create policy "participants read their chats"
  on public.coffee_chats for select
  to authenticated
  using ((select auth.uid()) in (initiator_id, recipient_id));

create policy "users create chats they initiate"
  on public.coffee_chats for insert
  to authenticated
  with check ((select auth.uid()) = initiator_id);

create policy "participants update their chats"
  on public.coffee_chats for update
  to authenticated
  using ((select auth.uid()) in (initiator_id, recipient_id))
  with check ((select auth.uid()) in (initiator_id, recipient_id));

-- ---------------------------------------------------------------------------
-- chat_time_proposals — either side can propose times; the other confirms
-- ---------------------------------------------------------------------------
create table public.chat_time_proposals (
  id           uuid primary key default gen_random_uuid(),
  chat_id      uuid not null references public.coffee_chats(id) on delete cascade,
  proposed_by  uuid not null references public.profiles(id) on delete cascade,
  start_at     timestamptz not null,
  status       text not null default 'open'
                 check (status in ('open', 'accepted', 'declined', 'withdrawn')),
  created_at   timestamptz not null default now(),
  unique (chat_id, start_at)
);

create index chat_time_proposals_chat_idx on public.chat_time_proposals (chat_id, status);

alter table public.chat_time_proposals enable row level security;

create policy "participants read proposals"
  on public.chat_time_proposals for select
  to authenticated
  using (
    exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

create policy "participants create proposals"
  on public.chat_time_proposals for insert
  to authenticated
  with check (
    (select auth.uid()) = proposed_by
    and exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

create policy "participants update proposals"
  on public.chat_time_proposals for update
  to authenticated
  using (
    exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

-- ---------------------------------------------------------------------------
-- messages — 1:1 thread attached to an accepted coffee chat
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  chat_id    uuid not null references public.coffee_chats(id) on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index messages_chat_created_idx on public.messages (chat_id, created_at desc);
create index messages_unread_idx on public.messages (chat_id, sender_id) where read_at is null;

alter table public.messages enable row level security;

create policy "participants read messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

-- Messaging only opens once the chat is accepted.
create policy "participants send messages"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and c.status = 'accepted'
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

-- Only the *recipient* may mark a message read.
create policy "recipients mark messages read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.coffee_chats c
      where c.id = chat_id
        and (select auth.uid()) in (c.initiator_id, c.recipient_id)
    )
  );

-- ---------------------------------------------------------------------------
-- notifications — written by triggers (security definer), read by the owner
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  actor_id   uuid references public.profiles(id) on delete set null,
  type       text not null
               check (type in ('chat_request', 'chat_accepted', 'chat_declined',
                               'new_message', 'time_proposed', 'time_confirmed')),
  chat_id    uuid references public.coffee_chats(id) on delete cascade,
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "users read own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "users update own notifications"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Notification triggers
-- ---------------------------------------------------------------------------
create or replace function public.notify_on_chat_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor_name text;
begin
  if tg_op = 'INSERT' then
    select coalesce(full_name, 'Someone') into actor_name
      from public.profiles where id = new.initiator_id;

    insert into public.notifications (user_id, actor_id, type, chat_id, title, body, href)
    values (new.recipient_id, new.initiator_id, 'chat_request', new.id,
            actor_name || ' wants to grab a coffee',
            new.message,
            '/chats/' || new.id);

  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    -- Notify whichever side did NOT make the change.
    if new.status = 'accepted' then
      select coalesce(full_name, 'Someone') into actor_name
        from public.profiles where id = new.recipient_id;
      insert into public.notifications (user_id, actor_id, type, chat_id, title, href)
      values (new.initiator_id, new.recipient_id, 'chat_accepted', new.id,
              actor_name || ' accepted your coffee chat', '/chats/' || new.id);

    elsif new.status = 'declined' then
      select coalesce(full_name, 'Someone') into actor_name
        from public.profiles where id = new.recipient_id;
      insert into public.notifications (user_id, actor_id, type, chat_id, title, href)
      values (new.initiator_id, new.recipient_id, 'chat_declined', new.id,
              actor_name || ' passed for now', '/chats');
    end if;

    if new.scheduled_at is distinct from old.scheduled_at and new.scheduled_at is not null then
      insert into public.notifications (user_id, actor_id, type, chat_id, title, href)
      select p.id, null, 'time_confirmed', new.id, 'Your coffee chat is scheduled', '/chats/' || new.id
      from (select new.initiator_id as id union all select new.recipient_id) p;
    end if;
  end if;

  return new;
end;
$$;

create trigger coffee_chats_notify
  after insert or update on public.coffee_chats
  for each row execute function public.notify_on_chat_change();

create or replace function public.notify_on_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_id uuid;
  actor_name text;
begin
  select case when c.initiator_id = new.sender_id then c.recipient_id else c.initiator_id end
    into target_id
  from public.coffee_chats c where c.id = new.chat_id;

  select coalesce(full_name, 'Someone') into actor_name
    from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, actor_id, type, chat_id, title, body, href)
  values (target_id, new.sender_id, 'new_message', new.chat_id,
          actor_name || ' sent you a message',
          left(new.body, 140),
          '/chats/' || new.chat_id);

  return new;
end;
$$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_on_message();

-- ---------------------------------------------------------------------------
-- Semantic matching
--
-- Cosine distance via pgvector, blended with a small shared-interest bonus so
-- that two people who literally checked the same boxes rank above a pair that
-- merely writes similarly. Returns 0..1 where 1 is a perfect match.
-- ---------------------------------------------------------------------------
create or replace function public.match_profiles(
  requester_id uuid,
  match_count  int   default 24,
  min_score    float default 0.0
)
returns table (
  id                uuid,
  full_name         text,
  headline          text,
  department        text,
  location          text,
  avatar_url        text,
  bio               text,
  working_on        text,
  score             real,
  semantic_score    real,
  shared_interests  text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select p.embedding, p.id
    from public.profiles p
    where p.id = requester_id
  ),
  my_interests as (
    select ui.interest_id from public.user_interests ui where ui.user_id = requester_id
  ),
  -- Anyone with a live or already-answered request is excluded from discovery.
  engaged as (
    select case when c.initiator_id = requester_id then c.recipient_id else c.initiator_id end as other_id
    from public.coffee_chats c
    where requester_id in (c.initiator_id, c.recipient_id)
      and c.status in ('pending', 'accepted')
  ),
  candidates as (
    select
      p.*,
      case
        when (select embedding from me) is null or p.embedding is null then 0.5::real
        else (1 - (p.embedding <=> (select embedding from me)))::real
      end as sem,
      coalesce(
        array_agg(i.name order by i.name) filter (where i.name is not null),
        '{}'::text[]
      ) as shared
    from public.profiles p
    left join public.user_interests ui
      on ui.user_id = p.id and ui.interest_id in (select interest_id from my_interests)
    left join public.interests i on i.id = ui.interest_id
    where p.id <> requester_id
      and p.open_to_matching
      and p.onboarding_completed
      and p.id not in (select other_id from engaged)
    group by p.id
  )
  select
    c.id,
    c.full_name,
    c.headline,
    c.department,
    c.location,
    c.avatar_url,
    c.bio,
    c.working_on,
    -- 80% semantic, 20% overlap bonus (saturating at 4 shared interests)
    least(1.0, c.sem * 0.8 + least(cardinality(c.shared), 4) * 0.05)::real as score,
    c.sem as semantic_score,
    c.shared as shared_interests
  from candidates c
  where least(1.0, c.sem * 0.8 + least(cardinality(c.shared), 4) * 0.05) >= min_score
  order by score desc, c.full_name asc
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- New-user bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.coffee_chats;

-- ---------------------------------------------------------------------------
-- Interest taxonomy seed
-- ---------------------------------------------------------------------------
insert into public.interests (slug, name, category, emoji) values
  ('frontend',        'Frontend',            'craft',     '🎨'),
  ('backend',         'Backend',             'craft',     '⚙️'),
  ('infra',           'Infrastructure',      'craft',     '🏗️'),
  ('ml',              'Machine Learning',    'craft',     '🧠'),
  ('design-systems',  'Design Systems',      'craft',     '🧩'),
  ('product-design',  'Product Design',      'craft',     '✏️'),
  ('data',            'Data & Analytics',    'craft',     '📊'),
  ('security',        'Security',            'craft',     '🔐'),
  ('mobile',          'Mobile',              'craft',     '📱'),
  ('devrel',          'Developer Relations', 'craft',     '📣'),

  ('startups',        'Startups',            'topic',     '🚀'),
  ('open-source',     'Open Source',         'topic',     '🌐'),
  ('typography',      'Typography',          'topic',     '🔠'),
  ('ai-ethics',       'AI Ethics',           'topic',     '⚖️'),
  ('career-growth',   'Career Growth',       'topic',     '📈'),
  ('management',      'Management',          'topic',     '🧭'),
  ('writing',         'Writing',             'topic',     '✍️'),
  ('economics',       'Economics',           'topic',     '💹'),

  ('hiking',          'Hiking',              'hobby',     '🥾'),
  ('running',         'Running',             'hobby',     '🏃'),
  ('climbing',        'Climbing',            'hobby',     '🧗'),
  ('cycling',         'Cycling',             'hobby',     '🚲'),
  ('board-games',     'Board Games',         'hobby',     '🎲'),
  ('video-games',     'Video Games',         'hobby',     '🎮'),
  ('photography',     'Photography',         'hobby',     '📷'),
  ('music',           'Music',               'hobby',     '🎧'),
  ('cooking',         'Cooking',             'hobby',     '🍳'),
  ('reading',         'Reading',             'hobby',     '📚'),
  ('woodworking',     'Woodworking',         'hobby',     '🪵'),
  ('gardening',       'Gardening',           'hobby',     '🌱'),

  ('coffee',          'Coffee',              'lifestyle', '☕'),
  ('tea',             'Tea',                 'lifestyle', '🍵'),
  ('travel',          'Travel',              'lifestyle', '✈️'),
  ('parenting',       'Parenting',           'lifestyle', '👶'),
  ('pets',            'Pets',                'lifestyle', '🐕'),
  ('fitness',         'Fitness',             'lifestyle', '🏋️'),
  ('volunteering',    'Volunteering',        'lifestyle', '🤝'),
  ('film',            'Film & TV',           'lifestyle', '🎬')
on conflict (slug) do nothing;
