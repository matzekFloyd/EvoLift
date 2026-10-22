-- An upcoming plan session (performed_on after today) is scheduled.
-- It does not count as the one session you can log now, so the plan can move on.
-- Moving that session onto today is checked, and still stops when another loggable session is open.

create or replace function public.enforce_one_open_plan_session()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  open_count integer;
begin
  if new.plan_id is null or new.completed_at is not null then
    return new;
  end if;

  select count(*)
  into open_count
  from public.workout_sessions
  where plan_id = new.plan_id
    and completed_at is null
    and performed_on <= current_date
    and id is distinct from new.id;

  if open_count >= 1 then
    raise exception 'open plan session limit'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

alter function public.enforce_one_open_plan_session() owner to postgres;

revoke all on function public.enforce_one_open_plan_session() from public;
grant execute on function public.enforce_one_open_plan_session() to authenticated;
grant execute on function public.enforce_one_open_plan_session() to service_role;

drop trigger if exists trg_workout_sessions_one_open_plan on public.workout_sessions;
create trigger trg_workout_sessions_one_open_plan
before insert or update of plan_id, completed_at, performed_on
on public.workout_sessions
for each row execute function public.enforce_one_open_plan_session();
