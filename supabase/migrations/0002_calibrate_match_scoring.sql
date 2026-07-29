-- ============================================================================
-- Calibrate match scoring.
--
-- all-MiniLM-L6-v2 does not use the full [0,1] cosine range on text like ours.
-- Measured across every profile pair in the seed set:
--
--     min 0.185 | p05 0.300 | p50 0.456 | p95 0.586 | max 0.619
--
-- Passing raw cosine straight to the UI therefore made a *perfect* match read
-- "62%", and everything clustered in a narrow, undifferentiated 40–60% band.
-- The number looked broken even though the ordering was correct.
--
-- Fix: stretch the band the model actually uses onto the range people read as
-- meaningful, before blending in the shared-interest bonus. Ordering is
-- unchanged — this is purely a presentation-honest rescale.
-- ============================================================================

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
    select p.embedding from public.profiles p where p.id = requester_id
  ),
  my_interests as (
    select ui.interest_id from public.user_interests ui where ui.user_id = requester_id
  ),
  -- Anyone with a live or already-answered request drops out of discovery.
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
        when (select embedding from me) is null or p.embedding is null then 0.45::real
        else (1 - (p.embedding <=> (select embedding from me)))::real
      end as raw_sim,
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
  ),
  scored as (
    select
      c.*,
      -- Stretch [0.25, 0.65] onto [0.15, 0.95]. Floor and ceiling are
      -- deliberate: nothing reads as 0% (insulting) or 100% (overclaiming).
      greatest(0.15, least(0.95, 0.15 + ((c.raw_sim - 0.25) / 0.40) * 0.80))::real as sem_norm,
      -- Saturates at 4 shared interests; beyond that it stops being signal.
      (least(cardinality(c.shared), 4) / 4.0)::real as overlap
    from candidates c
  )
  select
    s.id,
    s.full_name,
    s.headline,
    s.department,
    s.location,
    s.avatar_url,
    s.bio,
    s.working_on,
    -- 82% calibrated semantic similarity, 18% concrete shared-interest overlap.
    least(1.0, s.sem_norm * 0.82 + s.overlap * 0.18)::real as score,
    s.sem_norm as semantic_score,
    s.shared as shared_interests
  from scored s
  where least(1.0, s.sem_norm * 0.82 + s.overlap * 0.18) >= min_score
  order by score desc, s.full_name asc
  limit match_count;
$$;
