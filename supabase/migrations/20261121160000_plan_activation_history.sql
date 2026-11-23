-- Plan content versions and activation history (issue #563).
-- A session started from a plan stores that plan's content_version.
-- Activating or deactivating a plan writes workout_plan_activations.
-- Backfill follows evo-lift/lib/plan-history.ts: tagged sessions keep their plan,
-- an unfinished session with no plan stays unassigned, and a finished untagged
-- session is assigned only when one activation window contains it.

alter table public.workout_plans
  add column content_version integer not null default 1;

alter table public.workout_plans
  add constraint workout_plans_content_version_positive_chk
  check (content_version > 0);

alter table public.workout_sessions
  add column plan_version integer;

alter table public.workout_sessions
  add constraint workout_sessions_plan_version_chk
  check (plan_version is null or (plan_id is not null and plan_version > 0));

create table public.workout_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  user_id uuid not null,
  version integer not null,
  snapshot jsonb not null,
  created_at timestamp with time zone not null default now(),
  constraint workout_plan_versions_version_positive_chk check (version > 0),
  constraint workout_plan_versions_plan_version_uniq unique (plan_id, version),
  constraint workout_plan_versions_plan_id_fkey
    foreign key (plan_id) references public.workout_plans (id) on delete cascade,
  constraint workout_plan_versions_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade
);

create index idx_workout_plan_versions_user
  on public.workout_plan_versions using btree (user_id);

create table public.workout_plan_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  plan_id uuid not null,
  activated_at timestamp with time zone not null default now(),
  deactivated_at timestamp with time zone,
  constraint workout_plan_activations_period_chk
    check (deactivated_at is null or deactivated_at >= activated_at),
  constraint workout_plan_activations_plan_id_fkey
    foreign key (plan_id) references public.workout_plans (id) on delete cascade,
  constraint workout_plan_activations_user_id_fkey
    foreign key (user_id) references auth.users (id) on delete cascade
);

create unique index workout_plan_activations_one_open_per_user
  on public.workout_plan_activations using btree (user_id)
  where deactivated_at is null;

create index idx_workout_plan_activations_plan
  on public.workout_plan_activations using btree (plan_id, activated_at);

comment on column public.workout_plans.content_version is
  'Increments when the plan name, notes, or days change. Sessions store the version they were started from.';

comment on column public.workout_sessions.plan_version is
  'content_version of the plan when the session was started. Null when the session has no plan.';

comment on table public.workout_plan_versions is
  'Snapshot of a plan at one content_version, so a later edit does not rewrite session history.';

comment on table public.workout_plan_activations is
  'One row each time a plan is activated. deactivated_at is null while that activation is still open.';

create or replace function public.workout_plan_snapshot(p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object(
    'name', p.name,
    'notes', p.notes,
    'days', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', d.id,
          'name', d.name,
          'position', d.position,
          'exercises', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'exercise_id', e.exercise_id,
                'position', e.position,
                'target_sets', e.target_sets,
                'target_reps', e.target_reps,
                'target_weight_kg', e.target_weight_kg,
                'base_weight_kg', e.base_weight_kg,
                'notes', e.notes
              )
              order by e.position
            )
            from public.workout_plan_day_exercises e
            where e.plan_day_id = d.id
          ), '[]'::jsonb)
        )
        order by d.position
      )
      from public.workout_plan_days d
      where d.plan_id = p.id
    ), '[]'::jsonb)
  )
  from public.workout_plans p
  where p.id = p_plan_id;
$$;

create or replace function public.capture_workout_plan_version(p_plan_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_version integer;
  v_snapshot jsonb;
  v_latest jsonb;
begin
  select user_id, content_version
  into v_user_id, v_version
  from public.workout_plans
  where id = p_plan_id;

  if v_user_id is null then
    return null;
  end if;

  if auth.uid() is not null and auth.uid() is distinct from v_user_id then
    raise exception 'Plan not found.';
  end if;

  v_snapshot := public.workout_plan_snapshot(p_plan_id);
  if v_snapshot is null then
    return null;
  end if;

  select snapshot
  into v_latest
  from public.workout_plan_versions
  where plan_id = p_plan_id
    and version = v_version;

  if v_latest is not null and v_latest = v_snapshot then
    return v_version;
  end if;

  if v_latest is not null then
    v_version := v_version + 1;
    update public.workout_plans
    set content_version = v_version
    where id = p_plan_id;
  end if;

  insert into public.workout_plan_versions (plan_id, user_id, version, snapshot)
  values (p_plan_id, v_user_id, v_version, v_snapshot);

  return v_version;
end;
$$;

create or replace function public.trg_capture_workout_plan_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_plan_id uuid;
begin
  if tg_op = 'DELETE' then
    v_plan_id := old.plan_id;
  else
    v_plan_id := new.plan_id;
  end if;
  perform public.capture_workout_plan_version(v_plan_id);
  return null;
end;
$$;

create or replace function public.trg_workout_plan_activation_history()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.is_active and (tg_op = 'INSERT' or old.is_active is not true) then
    update public.workout_plan_activations
    set deactivated_at = clock_timestamp()
    where user_id = new.user_id
      and deactivated_at is null
      and plan_id is distinct from new.id;

    insert into public.workout_plan_activations (user_id, plan_id, activated_at)
    select new.user_id, new.id, clock_timestamp()
    where not exists (
      select 1
      from public.workout_plan_activations
      where user_id = new.user_id
        and plan_id = new.id
        and deactivated_at is null
    );
  elsif tg_op = 'UPDATE' and old.is_active is true and new.is_active is not true then
    update public.workout_plan_activations
    set deactivated_at = clock_timestamp()
    where user_id = new.user_id
      and plan_id = new.id
      and deactivated_at is null;
  end if;
  return null;
end;
$$;

create or replace function public.trg_stamp_workout_session_plan_version()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.plan_id is null then
    new.plan_version := null;
  elsif new.plan_version is null then
    select content_version
    into new.plan_version
    from public.workout_plans
    where id = new.plan_id;
  end if;
  return new;
end;
$$;

-- Existing plans become version 1. Later edits snapshot the next version.
select public.capture_workout_plan_version(id)
from public.workout_plans;

update public.workout_sessions as session
set plan_version = plan.content_version
from public.workout_plans as plan
where session.plan_id = plan.id
  and session.plan_version is null;

-- Windows come from runs of sessions that already name a plan, ordered by when they were logged.
with tagged as (
  select
    session.user_id,
    session.plan_id,
    session.created_at,
    session.id,
    lag(session.plan_id) over (
      partition by session.user_id
      order by session.created_at, session.id
    ) as prev_plan_id
  from public.workout_sessions as session
  where session.plan_id is not null
),
runs as (
  select
    user_id,
    plan_id,
    created_at,
    id,
    sum(case when plan_id is distinct from prev_plan_id then 1 else 0 end) over (
      partition by user_id
      order by created_at, id
    ) as run_no
  from tagged
),
periods as (
  select
    user_id,
    plan_id,
    min(created_at) as activated_at,
    max(created_at) as last_at,
    run_no
  from runs
  group by user_id, plan_id, run_no
),
ordered as (
  select
    period.user_id,
    period.plan_id,
    period.activated_at,
    period.last_at,
    period.run_no,
    lead(period.activated_at) over (
      partition by period.user_id
      order by period.activated_at, period.run_no
    ) as next_activated_at,
    plan.is_active
  from periods as period
  join public.workout_plans as plan on plan.id = period.plan_id
)
insert into public.workout_plan_activations (user_id, plan_id, activated_at, deactivated_at)
select
  user_id,
  plan_id,
  activated_at,
  case
    when next_activated_at is not null then next_activated_at
    when is_active then null
    else last_at
  end
from ordered;

-- An active plan with no tagged sessions starts its history now, so older free sessions stay unassigned.
insert into public.workout_plan_activations (user_id, plan_id, activated_at)
select plan.user_id, plan.id, now()
from public.workout_plans as plan
where plan.is_active
  and not exists (
    select 1
    from public.workout_plan_activations as activation
    where activation.user_id = plan.user_id
      and activation.deactivated_at is null
  );

with matches as (
  select
    session.id as session_id,
    activation.plan_id,
    plan.content_version,
    count(*) over (partition by session.id) as match_count
  from public.workout_sessions as session
  join public.workout_plan_activations as activation
    on activation.user_id = session.user_id
   and session.created_at >= activation.activated_at
   and (activation.deactivated_at is null or session.created_at < activation.deactivated_at)
  join public.workout_plans as plan on plan.id = activation.plan_id
  where session.plan_id is null
    and session.completed_at is not null
),
unique_matches as (
  select session_id, plan_id, content_version
  from matches
  where match_count = 1
)
update public.workout_sessions as session
set
  plan_id = unique_matches.plan_id,
  plan_version = unique_matches.content_version
from unique_matches
where session.id = unique_matches.session_id
  and session.plan_id is null;

-- Day writes commit the plan content, then this deferred trigger snapshots it.
-- save, starter plans, and account import all write days in the same transaction.
create constraint trigger trg_workout_plan_days_capture_version
after insert or update or delete on public.workout_plan_days
deferrable initially deferred
for each row
execute function public.trg_capture_workout_plan_version();

create trigger trg_workout_plans_activation_history
after insert or update of is_active on public.workout_plans
for each row
execute function public.trg_workout_plan_activation_history();

create trigger trg_workout_sessions_stamp_plan_version
before insert or update on public.workout_sessions
for each row
execute function public.trg_stamp_workout_session_plan_version();

alter table public.workout_plan_versions enable row level security;
alter table public.workout_plan_activations enable row level security;

create policy workout_plan_versions_owner_select
on public.workout_plan_versions
for select
to authenticated
using (user_id = auth.uid());

create policy workout_plan_activations_owner_select
on public.workout_plan_activations
for select
to authenticated
using (user_id = auth.uid());

grant select on table public.workout_plan_versions to authenticated;
grant select on table public.workout_plan_activations to authenticated;
grant all on table public.workout_plan_versions to service_role;
grant all on table public.workout_plan_activations to service_role;

revoke all on function public.workout_plan_snapshot(uuid) from public;
revoke all on function public.capture_workout_plan_version(uuid) from public;
revoke all on function public.trg_capture_workout_plan_version() from public;
revoke all on function public.trg_workout_plan_activation_history() from public;
revoke all on function public.trg_stamp_workout_session_plan_version() from public;

grant execute on function public.capture_workout_plan_version(uuid) to authenticated;
grant execute on function public.capture_workout_plan_version(uuid) to service_role;
grant execute on function public.trg_capture_workout_plan_version() to authenticated;
grant execute on function public.trg_capture_workout_plan_version() to service_role;
grant execute on function public.trg_workout_plan_activation_history() to authenticated;
grant execute on function public.trg_workout_plan_activation_history() to service_role;
grant execute on function public.trg_stamp_workout_session_plan_version() to authenticated;
grant execute on function public.trg_stamp_workout_session_plan_version() to service_role;
