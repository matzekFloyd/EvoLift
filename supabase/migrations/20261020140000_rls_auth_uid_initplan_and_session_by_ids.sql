-- Speed up owner RLS and PK id-in lookups (#301).
-- 1) Wrap auth.uid() in (select ...) so Postgres plans it once (InitPlan).
-- 2) Add workout_sessions_by_ids: unnest → join on PK instead of scanning
--    idx_workout_sessions_user_date then filtering id = ANY(...).

-- ---------------------------------------------------------------------------
-- RLS: (select auth.uid())
-- ---------------------------------------------------------------------------

drop policy if exists "app_users_select_own" on public.app_users;
create policy "app_users_select_own"
on public.app_users
for select
to authenticated
using (id = (select auth.uid()));

drop policy if exists "app_users_update_own" on public.app_users;
create policy "app_users_update_own"
on public.app_users
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

drop policy if exists "app_users_insert_own" on public.app_users;
create policy "app_users_insert_own"
on public.app_users
for insert
to authenticated
with check (id = (select auth.uid()));

drop policy if exists "workout_sessions_owner_all" on public.workout_sessions;
create policy "workout_sessions_owner_all"
on public.workout_sessions
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "workout_session_exercises_owner_all" on public.workout_session_exercises;
create policy "workout_session_exercises_owner_all"
on public.workout_session_exercises
to authenticated
using (
  exists (
    select 1
    from public.workout_sessions ws
    where ws.id = workout_session_exercises.session_id
      and ws.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_sessions ws
    where ws.id = workout_session_exercises.session_id
      and ws.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_sets_owner_all" on public.workout_sets;
create policy "workout_sets_owner_all"
on public.workout_sets
to authenticated
using (
  exists (
    select 1
    from public.workout_session_exercises wse
    join public.workout_sessions ws on ws.id = wse.session_id
    where wse.id = workout_sets.session_exercise_id
      and ws.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_session_exercises wse
    join public.workout_sessions ws on ws.id = wse.session_id
    where wse.id = workout_sets.session_exercise_id
      and ws.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_templates_owner_all" on public.workout_templates;
create policy "workout_templates_owner_all"
on public.workout_templates
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "workout_template_exercises_owner_all" on public.workout_template_exercises;
create policy "workout_template_exercises_owner_all"
on public.workout_template_exercises
to authenticated
using (
  exists (
    select 1
    from public.workout_templates wt
    where wt.id = workout_template_exercises.template_id
      and wt.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_templates wt
    where wt.id = workout_template_exercises.template_id
      and wt.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_plans_owner_all" on public.workout_plans;
create policy "workout_plans_owner_all"
on public.workout_plans
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "workout_plan_days_owner_all" on public.workout_plan_days;
create policy "workout_plan_days_owner_all"
on public.workout_plan_days
to authenticated
using (
  exists (
    select 1
    from public.workout_plans wp
    where wp.id = workout_plan_days.plan_id
      and wp.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_plans wp
    where wp.id = workout_plan_days.plan_id
      and wp.user_id = (select auth.uid())
  )
);

drop policy if exists "workout_plan_day_exercises_owner_all" on public.workout_plan_day_exercises;
create policy "workout_plan_day_exercises_owner_all"
on public.workout_plan_day_exercises
to authenticated
using (
  exists (
    select 1
    from public.workout_plan_days d
    join public.workout_plans wp on wp.id = d.plan_id
    where d.id = workout_plan_day_exercises.plan_day_id
      and wp.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.workout_plan_days d
    join public.workout_plans wp on wp.id = d.plan_id
    where d.id = workout_plan_day_exercises.plan_day_id
      and wp.user_id = (select auth.uid())
  )
);

drop policy if exists "strength_milestones_owner_all" on public.strength_milestones;
create policy "strength_milestones_owner_all"
on public.strength_milestones
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "user_bodyweight_log_owner_all" on public.user_bodyweight_log;
create policy "user_bodyweight_log_owner_all"
on public.user_bodyweight_log
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "user_profile_metrics_owner_all" on public.user_profile_metrics;
create policy "user_profile_metrics_owner_all"
on public.user_profile_metrics
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "user_hidden_exercises_owner_all" on public.user_hidden_exercises;
create policy "user_hidden_exercises_owner_all"
on public.user_hidden_exercises
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "user_exercise_defaults_owner_all" on public.user_exercise_defaults;
create policy "user_exercise_defaults_owner_all"
on public.user_exercise_defaults
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "user_api_tokens_owner_all" on public.user_api_tokens;
create policy "user_api_tokens_owner_all"
on public.user_api_tokens
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RPC: PK-friendly session lookup by id list + owner
-- ---------------------------------------------------------------------------

create or replace function public.workout_sessions_by_ids(
  p_ids uuid[],
  p_user_id uuid
)
returns table (
  id uuid,
  performed_on date,
  created_at timestamp with time zone
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  caller uuid := (select auth.uid());
  jwt_role text := coalesce((select auth.role()), '');
begin
  if jwt_role is distinct from 'service_role' then
    if caller is null or caller is distinct from p_user_id then
      raise exception 'not allowed' using errcode = '42501';
    end if;
  end if;

  return query
  select ws.id, ws.performed_on, ws.created_at
  from unnest(p_ids) as wanted(id)
  inner join public.workout_sessions ws on ws.id = wanted.id
  where ws.user_id = p_user_id;
end;
$$;

revoke all on function public.workout_sessions_by_ids(uuid[], uuid) from public;
grant execute on function public.workout_sessions_by_ids(uuid[], uuid) to authenticated;
grant execute on function public.workout_sessions_by_ids(uuid[], uuid) to service_role;

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
  group by wse.exercise_id;
$$;
