-- The exercise list counts a session only when that exercise has a logged set.
-- Adding an exercise and leaving it empty no longer counts as history.

create or replace function public.exercise_past_session_counts(p_through date)
returns table (
  exercise_id uuid,
  session_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    wse.exercise_id,
    count(*)::integer as session_count
  from public.workout_session_exercises wse
  join public.workout_sessions ws on ws.id = wse.session_id
  where ws.user_id = (select auth.uid())
    and ws.performed_on <= p_through
    and exists (
      select 1
      from public.workout_sets wset
      where wset.session_exercise_id = wse.id
    )
  group by wse.exercise_id;
$$;

comment on function public.exercise_past_session_counts(date) is
  'How many non-future workout sessions have at least one logged set for each exercise, for the signed-in user.';
