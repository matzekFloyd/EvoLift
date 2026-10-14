-- Past session count per exercise for the signed-in user. One row per exercise.

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
  where ws.user_id = auth.uid()
    and ws.performed_on <= p_through
  group by wse.exercise_id;
$$;

comment on function public.exercise_past_session_counts(date) is
  'How many non-future workout sessions include each exercise, for the signed-in user.';

revoke all on function public.exercise_past_session_counts(date) from public;
grant execute on function public.exercise_past_session_counts(date) to authenticated;
grant execute on function public.exercise_past_session_counts(date) to service_role;
