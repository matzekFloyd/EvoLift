-- Explicit workout session lifecycle: started_at / completed_at.
-- In progress = started_at set and completed_at null (at most one per user).

alter table public.workout_sessions
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

comment on column public.workout_sessions.started_at is
  'When the first set was logged. Null until the session is in progress.';
comment on column public.workout_sessions.completed_at is
  'When the lifter marked the session completed. Null until then.';

-- Historical sessions with any logged set are treated as finished.
update public.workout_sessions ws
set
  started_at = coalesce(ws.started_at, ws.created_at),
  completed_at = coalesce(ws.completed_at, ws.created_at)
where ws.completed_at is null
  and exists (
    select 1
    from public.workout_session_exercises wse
    join public.workout_sets wset on wset.session_exercise_id = wse.id
    where wse.session_id = ws.id
  );

create unique index if not exists idx_workout_sessions_one_in_progress_per_user
  on public.workout_sessions (user_id)
  where started_at is not null and completed_at is null;

-- CREATE OR REPLACE cannot insert columns ahead of set_count.
drop view if exists public.home_session_summaries;
create view public.home_session_summaries
with (security_invoker = true) as
select
  ws.id,
  ws.user_id,
  ws.performed_on,
  ws.notes,
  ws.created_at,
  ws.started_at,
  ws.completed_at,
  coalesce(set_counts.set_count, 0) as set_count,
  coalesce(badges.exercise_badges, '[]'::jsonb) as exercise_badges
from public.workout_sessions ws
left join (
  select
    wse.session_id,
    count(wset.id)::integer as set_count
  from public.workout_session_exercises wse
  join public.workout_sets wset on wset.session_exercise_id = wse.id
  group by wse.session_id
) set_counts on set_counts.session_id = ws.id
left join (
  select
    grouped.session_id,
    jsonb_agg(grouped.badge order by grouped.position) as exercise_badges
  from (
    select
      wse.session_id,
      wse.position,
      jsonb_build_object(
        'slug', e.slug,
        'has_logged_set', count(wset.id) > 0,
        'not_done', wse.not_done
      ) as badge
    from public.workout_session_exercises wse
    join public.exercises e on e.id = wse.exercise_id
    left join public.workout_sets wset on wset.session_exercise_id = wse.id
    group by wse.session_id, wse.id, wse.position, e.slug, wse.not_done
  ) grouped
  group by grouped.session_id
) badges on badges.session_id = ws.id;

comment on view public.home_session_summaries is
  'Home list: one row per session with set count, lifecycle timestamps, and exercise badges.';

revoke all on table public.home_session_summaries from public;
revoke all on table public.home_session_summaries from anon;
grant select on table public.home_session_summaries to authenticated;
grant select on table public.home_session_summaries to service_role;
