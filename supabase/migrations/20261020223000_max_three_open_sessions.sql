-- Allow up to 3 open workout sessions (started and not finished).
-- Sessions that already exist, except future planned days, are marked finished
-- so the limit starts at zero.

update public.workout_sessions
set
  started_at = coalesce(started_at, created_at),
  completed_at = coalesce(completed_at, now())
where completed_at is null
  and performed_on <= current_date;

drop index if exists public.idx_workout_sessions_one_in_progress_per_user;

create or replace function public.enforce_max_open_workout_sessions()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare
  open_count integer;
begin
  if new.started_at is null or new.completed_at is not null then
    return new;
  end if;

  select count(*)
  into open_count
  from public.workout_sessions
  where user_id = new.user_id
    and started_at is not null
    and completed_at is null
    and id is distinct from new.id;

  if open_count >= 3 then
    raise exception 'open workout session limit'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

alter function public.enforce_max_open_workout_sessions() owner to postgres;

revoke all on function public.enforce_max_open_workout_sessions() from public;
grant execute on function public.enforce_max_open_workout_sessions() to authenticated;
grant execute on function public.enforce_max_open_workout_sessions() to service_role;

drop trigger if exists trg_workout_sessions_max_open on public.workout_sessions;
create trigger trg_workout_sessions_max_open
before insert or update of started_at, completed_at
on public.workout_sessions
for each row execute function public.enforce_max_open_workout_sessions();
