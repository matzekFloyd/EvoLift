-- Seed four starter plans when an account has no plans yet (EVO-426).
-- Idempotent: skips users who already have any workout_plans row.
-- Deleting the plans later does not bring them back. Nothing calls this on delete.

create or replace function public.seed_default_workout_plans(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_seed_count integer;
  v_inserted integer;
  v_missing text;
begin
  if p_user_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.workout_plans
    where user_id = p_user_id
  ) then
    return;
  end if;

  with seed as (
    select
      column1::text as plan_name,
      column2::integer as day_position,
      column3::text as day_name,
      column4::integer as exercise_position,
      column5::text as slug,
      column6::integer as target_sets,
      column7::integer as target_reps,
      column8::text as notes
    from (values
    ('Full body', 1, 'Full Body #1', 1, 'back-squat', 3, 6, null),
    ('Full body', 1, 'Full Body #1', 2, 'barbell-bench-press', 3, 8, null),
    ('Full body', 1, 'Full Body #1', 3, 'lat-pulldown', 3, 10, null),
    ('Full body', 1, 'Full Body #1', 4, 'barbell-romanian-deadlift', 3, 10, null),
    ('Full body', 1, 'Full Body #1', 5, 'assisted-dip', 3, 8, null),
    ('Full body', 1, 'Full Body #1', 6, 'standing-calf-raise', 3, 10, null),
    ('Full body', 1, 'Full Body #1', 7, 'dumbbell-supinated-curl', 3, 10, null),
    ('Full body', 2, 'Full Body #2', 1, 'deadlift', 3, 5, null),
    ('Full body', 2, 'Full Body #2', 2, 'overhead-press', 3, 8, null),
    ('Full body', 2, 'Full Body #2', 3, 'chest-supported-t-bar-row', 3, 12, null),
    ('Full body', 2, 'Full Body #2', 4, 'leg-extension', 3, 12, null),
    ('Full body', 2, 'Full Body #2', 5, 'cable-flye', 3, 12, null),
    ('Full body', 2, 'Full Body #2', 6, 'crunch', 3, 12, null),
    ('Full body', 2, 'Full Body #2', 7, 'dumbbell-skull-crusher', 3, 12, null),
    ('Full body', 3, 'Full Body #3', 1, 'dumbbell-walking-lunge', 3, 10, null),
    ('Full body', 3, 'Full Body #3', 2, 'dumbbell-incline-press', 3, 8, null),
    ('Full body', 3, 'Full Body #3', 3, 'reverse-grip-lat-pulldown', 3, 10, null),
    ('Full body', 3, 'Full Body #3', 4, 'barbell-hip-thrust', 3, 12, null),
    ('Full body', 3, 'Full Body #3', 5, 'seated-face-pull', 3, 12, null),
    ('Full body', 3, 'Full Body #3', 6, 'dumbbell-lateral-raise', 3, 10, null),
    ('Full body', 3, 'Full Body #3', 7, 'lying-leg-curl', 3, 10, null),
    ('Upper / Lower', 1, 'Lower Body #1', 1, 'back-squat', 3, 6, null),
    ('Upper / Lower', 1, 'Lower Body #1', 2, 'barbell-romanian-deadlift', 3, 10, null),
    ('Upper / Lower', 1, 'Lower Body #1', 3, 'barbell-hip-thrust', 3, 12, null),
    ('Upper / Lower', 1, 'Lower Body #1', 4, 'leg-extension', 3, 12, null),
    ('Upper / Lower', 1, 'Lower Body #1', 5, 'lying-leg-curl', 3, 12, null),
    ('Upper / Lower', 1, 'Lower Body #1', 6, 'machine-seated-hip-abduction', 3, 6, null),
    ('Upper / Lower', 1, 'Lower Body #1', 7, 'crunch', 3, 12, null),
    ('Upper / Lower', 2, 'Upper Body #1', 1, 'barbell-bench-press', 3, 5, null),
    ('Upper / Lower', 2, 'Upper Body #1', 2, 'lat-pulldown', 3, 10, null),
    ('Upper / Lower', 2, 'Upper Body #1', 3, 'overhead-press', 3, 10, null),
    ('Upper / Lower', 2, 'Upper Body #1', 4, 'chest-supported-t-bar-row', 3, 12, null),
    ('Upper / Lower', 2, 'Upper Body #1', 5, 'cable-flye', 3, 12, null),
    ('Upper / Lower', 2, 'Upper Body #1', 6, 'dumbbell-supinated-curl', 3, 10, null),
    ('Upper / Lower', 2, 'Upper Body #1', 7, 'single-arm-rope-tricep-extension', 3, 12, null),
    ('Upper / Lower', 3, 'Lower Body #2', 1, 'deadlift', 3, 8, null),
    ('Upper / Lower', 3, 'Lower Body #2', 2, 'dumbbell-walking-lunge', 3, 10, null),
    ('Upper / Lower', 3, 'Lower Body #2', 3, 'single-leg-leg-extension', 3, 15, null),
    ('Upper / Lower', 3, 'Lower Body #2', 4, 'single-leg-lying-leg-curl', 3, 15, null),
    ('Upper / Lower', 3, 'Lower Body #2', 5, 'machine-seated-hip-abduction', 3, 15, null),
    ('Upper / Lower', 3, 'Lower Body #2', 6, 'standing-calf-raise', 3, 12, null),
    ('Upper / Lower', 3, 'Lower Body #2', 7, 'plank', 3, 20, '20 sec'),
    ('Upper / Lower', 4, 'Upper Body #2', 1, 'dumbbell-incline-press', 3, 8, null),
    ('Upper / Lower', 4, 'Upper Body #2', 2, 'reverse-grip-lat-pulldown', 3, 8, null),
    ('Upper / Lower', 4, 'Upper Body #2', 3, 'assisted-dip', 3, 10, null),
    ('Upper / Lower', 4, 'Upper Body #2', 4, 'barbell-bent-over-row', 3, 12, null),
    ('Upper / Lower', 4, 'Upper Body #2', 5, 'dumbbell-lateral-raise', 3, 15, null),
    ('Upper / Lower', 4, 'Upper Body #2', 6, 'seated-face-pull', 3, 15, null),
    ('Upper / Lower', 4, 'Upper Body #2', 7, 'hammer-curl', 3, 8, null),
    ('Push / Pull / Legs', 1, 'Push', 1, 'barbell-bench-press', 3, 5, null),
    ('Push / Pull / Legs', 1, 'Push', 2, 'overhead-press', 3, 5, null),
    ('Push / Pull / Legs', 1, 'Push', 3, 'dumbbell-incline-press', 3, 8, null),
    ('Push / Pull / Legs', 1, 'Push', 4, 'dumbbell-lateral-raise', 3, 10, null),
    ('Push / Pull / Legs', 1, 'Push', 5, 'pec-deck', 3, 10, null),
    ('Push / Pull / Legs', 1, 'Push', 6, 'cable-tricep-pushdown', 3, 10, null),
    ('Push / Pull / Legs', 2, 'Pull', 1, 'barbell-bent-over-row', 3, 8, null),
    ('Push / Pull / Legs', 2, 'Pull', 2, 'lat-pulldown', 3, 8, null),
    ('Push / Pull / Legs', 2, 'Pull', 3, 'cable-seated-row', 3, 8, null),
    ('Push / Pull / Legs', 2, 'Pull', 4, 'seated-face-pull', 3, 10, null),
    ('Push / Pull / Legs', 2, 'Pull', 5, 'barbell-curl', 3, 10, null),
    ('Push / Pull / Legs', 2, 'Pull', 6, 'hammer-curl', 3, 10, null),
    ('Push / Pull / Legs', 3, 'Legs', 1, 'back-squat', 3, 5, null),
    ('Push / Pull / Legs', 3, 'Legs', 2, 'barbell-romanian-deadlift', 3, 8, null),
    ('Push / Pull / Legs', 3, 'Legs', 3, 'leg-press', 3, 8, null),
    ('Push / Pull / Legs', 3, 'Legs', 4, 'lying-leg-curl', 3, 10, null),
    ('Push / Pull / Legs', 3, 'Legs', 5, 'standing-calf-raise', 3, 10, null),
    ('Push / Pull / Legs', 3, 'Legs', 6, 'cable-crunch', 3, 10, null),
    ('Body part', 1, 'Chest & Triceps', 1, 'barbell-bench-press', 3, 6, null),
    ('Body part', 1, 'Chest & Triceps', 2, 'dumbbell-incline-press', 3, 8, null),
    ('Body part', 1, 'Chest & Triceps', 3, 'cable-flye', 3, 12, null),
    ('Body part', 1, 'Chest & Triceps', 4, 'assisted-dip', 3, 10, null),
    ('Body part', 1, 'Chest & Triceps', 5, 'dumbbell-skull-crusher', 3, 12, null),
    ('Body part', 2, 'Legs & Abs', 1, 'back-squat', 3, 6, null),
    ('Body part', 2, 'Legs & Abs', 2, 'barbell-romanian-deadlift', 3, 8, null),
    ('Body part', 2, 'Legs & Abs', 3, 'barbell-hip-thrust', 3, 12, null),
    ('Body part', 2, 'Legs & Abs', 4, 'leg-extension', 3, 12, null),
    ('Body part', 2, 'Legs & Abs', 5, 'lying-leg-curl', 3, 12, null),
    ('Body part', 2, 'Legs & Abs', 6, 'standing-calf-raise', 2, 8, null),
    ('Body part', 2, 'Legs & Abs', 7, 'crunch', 2, 12, null),
    ('Body part', 3, 'Back & Biceps', 1, 'reverse-grip-lat-pulldown', 3, 8, null),
    ('Body part', 3, 'Back & Biceps', 2, 'cable-seated-row', 3, 10, null),
    ('Body part', 3, 'Back & Biceps', 3, 'chest-supported-t-bar-row', 3, 12, null),
    ('Body part', 3, 'Back & Biceps', 4, 'seated-face-pull', 3, 15, null),
    ('Body part', 3, 'Back & Biceps', 5, 'dumbbell-supinated-curl', 3, 12, null),
    ('Body part', 4, 'Legs & Abs', 1, 'deadlift', 3, 5, null),
    ('Body part', 4, 'Legs & Abs', 2, 'dumbbell-walking-lunge', 3, 10, null),
    ('Body part', 4, 'Legs & Abs', 3, 'single-leg-leg-extension', 2, 15, null),
    ('Body part', 4, 'Legs & Abs', 4, 'single-leg-lying-leg-curl', 2, 15, null),
    ('Body part', 4, 'Legs & Abs', 5, 'machine-seated-hip-abduction', 3, 15, null),
    ('Body part', 4, 'Legs & Abs', 6, 'standing-calf-raise', 2, 12, null),
    ('Body part', 4, 'Legs & Abs', 7, 'plank', 3, 20, '20 sec'),
    ('Body part', 5, 'Shoulders & Arms', 1, 'overhead-press', 3, 6, null),
    ('Body part', 5, 'Shoulders & Arms', 2, 'dumbbell-lateral-raise', 3, 12, null),
    ('Body part', 5, 'Shoulders & Arms', 3, 'cable-reverse-flye', 3, 15, null),
    ('Body part', 5, 'Shoulders & Arms', 4, 'single-arm-rope-tricep-extension', 2, 12, null),
    ('Body part', 5, 'Shoulders & Arms', 5, 'single-arm-cable-curl', 2, 12, null)
    ) as v
  ),
  missing as (
    select string_agg(distinct seed.slug, ', ' order by seed.slug) as slugs
    from seed
    left join public.exercises e on e.slug = seed.slug
    where e.id is null
  ),
  inserted_plans as (
    insert into public.workout_plans (user_id, name, notes, is_active)
    select p_user_id, plans.plan_name, 'Do the days in order, then start again.', false
    from (select distinct plan_name from seed) as plans
    where (select slugs from missing) is null
    returning id, name
  ),
  inserted_days as (
    insert into public.workout_plan_days (plan_id, name, position)
    select p.id, days.day_name, days.day_position
    from inserted_plans p
    join (
      select distinct plan_name, day_position, day_name
      from seed
    ) as days on days.plan_name = p.name
    returning id, plan_id, position
  ),
  inserted_exercises as (
    insert into public.workout_plan_day_exercises (
      plan_day_id,
      exercise_id,
      position,
      target_sets,
      target_reps,
      target_weight_kg,
      base_weight_kg,
      notes
    )
    select
      day.id,
      e.id,
      seed.exercise_position,
      seed.target_sets,
      seed.target_reps,
      null,
      null,
      seed.notes
    from inserted_days day
    join inserted_plans p on p.id = day.plan_id
    join seed on seed.plan_name = p.name and seed.day_position = day.position
    join public.exercises e on e.slug = seed.slug
    returning 1
  )
  select
    (select count(*)::integer from seed),
    (select count(*)::integer from inserted_exercises),
    (select slugs from missing)
  into v_seed_count, v_inserted, v_missing;

  if v_missing is not null then
    raise exception 'Starter plan exercise is missing from the catalog: %', v_missing;
  end if;

  if v_inserted is distinct from v_seed_count then
    raise exception 'Starter plans did not insert every exercise.';
  end if;
end;
$$;

comment on function public.seed_default_workout_plans(uuid) is
  'Inserts Full body, Upper / Lower, Push / Pull / Legs, and Body part for a user with no plans yet. Safe to call more than once. Does not replace plans the lifter deleted.';

revoke all on function public.seed_default_workout_plans(uuid) from public;
grant execute on function public.seed_default_workout_plans(uuid) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.app_users (id)
  values (new.id)
  on conflict (id) do nothing;

  perform public.seed_default_strength_milestones(new.id);
  perform public.seed_default_workout_plans(new.id);

  return new;
end;
$$;

-- Existing accounts with an empty Plans list get the same four plans once.
do $$
declare
  user_row record;
begin
  for user_row in
    select u.id
    from public.app_users u
    where not exists (
      select 1
      from public.workout_plans p
      where p.user_id = u.id
    )
  loop
    perform public.seed_default_workout_plans(user_row.id);
  end loop;
end;
$$;
