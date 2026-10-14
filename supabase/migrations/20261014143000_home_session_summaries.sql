-- One row per workout session for the home page: set count and exercise badges.
-- security_invoker keeps the owner row-level security policies on the base tables.

create or replace view public.home_session_summaries
with (security_invoker = true) as
select
  ws.id,
  ws.user_id,
  ws.performed_on,
  ws.notes,
  ws.created_at,
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
        'has_logged_set', count(wset.id) > 0
      ) as badge
    from public.workout_session_exercises wse
    join public.exercises e on e.id = wse.exercise_id
    left join public.workout_sets wset on wset.session_exercise_id = wse.id
    group by wse.session_id, wse.id, wse.position, e.slug
  ) grouped
  group by grouped.session_id
) badges on badges.session_id = ws.id;

comment on view public.home_session_summaries is
  'Home list: one row per session with set count and exercise badges in session order.';

revoke all on table public.home_session_summaries from public;
revoke all on table public.home_session_summaries from anon;
grant select on table public.home_session_summaries to authenticated;
grant select on table public.home_session_summaries to service_role;
