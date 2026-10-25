-- A plan stays within one sample week: at most 7 days.
-- Deferred so a save can shuffle positions before the final count is checked.
-- Security definer: the check also runs at commit of auth signup, as supabase_auth_admin,
-- which cannot read workout_plan_days. The owner can.

create or replace function public.enforce_max_plan_days()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_plan_id uuid := coalesce(new.plan_id, old.plan_id);
  v_count integer;
begin
  select count(*)
  into v_count
  from public.workout_plan_days
  where plan_id = v_plan_id;

  if v_count > 7 then
    raise exception 'A plan can have at most 7 days.';
  end if;

  return null;
end;
$$;

alter function public.enforce_max_plan_days() owner to postgres;

revoke all on function public.enforce_max_plan_days() from public;
grant execute on function public.enforce_max_plan_days() to authenticated;
grant execute on function public.enforce_max_plan_days() to service_role;

drop trigger if exists trg_workout_plan_days_max_seven on public.workout_plan_days;
create constraint trigger trg_workout_plan_days_max_seven
after insert or update or delete
on public.workout_plan_days
deferrable initially deferred
for each row
execute function public.enforce_max_plan_days();
