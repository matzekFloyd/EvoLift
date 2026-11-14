-- Personal API tokens call Postgres as service_role, so auth.uid() is empty.
-- A signed-in session still owns the row via auth.uid(). Service role may pass
-- the user id the API resolved from the token. Other roles stay logged out.

drop function if exists public.save_workout_plan(uuid, text, text, boolean, jsonb);

create or replace function public.save_workout_plan(
  p_plan_id uuid,
  p_name text,
  p_notes text,
  p_is_active boolean,
  p_days jsonb,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_user_id uuid;
  v_plan_id uuid;
  v_name text;
  v_notes text;
  v_day jsonb;
  v_exercise jsonb;
  v_day_id uuid;
  v_position integer := 0;
  v_exercise_position integer;
  v_kept_ids uuid[] := array[]::uuid[];
  v_existing_id uuid;
begin
  if auth.uid() is not null then
    v_user_id := auth.uid();
  elsif current_user in ('service_role', 'postgres') then
    v_user_id := p_user_id;
  else
    v_user_id := null;
  end if;

  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  v_name := trim(coalesce(p_name, ''));
  if length(v_name) = 0 then
    raise exception 'Please enter a plan name.';
  end if;
  if length(v_name) > 120 then
    raise exception 'Plan name cannot be longer than 120 characters.';
  end if;

  v_notes := nullif(trim(coalesce(p_notes, '')), '');
  if v_notes is not null and length(v_notes) > 500 then
    raise exception 'Plan notes cannot be longer than 500 characters.';
  end if;

  if p_days is null or jsonb_typeof(p_days) <> 'array' then
    raise exception 'Please provide the plan days.';
  end if;

  if p_plan_id is null then
    insert into public.workout_plans (user_id, name, notes, is_active)
    values (v_user_id, v_name, v_notes, coalesce(p_is_active, false))
    returning id into v_plan_id;
  else
    update public.workout_plans
    set
      name = v_name,
      notes = v_notes,
      is_active = coalesce(p_is_active, false)
    where id = p_plan_id and user_id = v_user_id
    returning id into v_plan_id;

    if v_plan_id is null then
      raise exception 'Plan not found.';
    end if;
  end if;

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    if length(trim(coalesce(v_day->>'name', ''))) = 0 then
      raise exception 'Please enter a name for each day.';
    end if;
    if length(trim(v_day->>'name')) > 80 then
      raise exception 'Day name cannot be longer than 80 characters.';
    end if;

    if coalesce(v_day->>'id', '') <> '' then
      v_existing_id := (v_day->>'id')::uuid;
      if v_existing_id = any (v_kept_ids) then
        raise exception 'Each day can only appear once.';
      end if;
      if not exists (
        select 1
        from public.workout_plan_days d
        where d.id = v_existing_id and d.plan_id = v_plan_id
      ) then
        raise exception 'That day is not part of this plan.';
      end if;
      v_kept_ids := array_append(v_kept_ids, v_existing_id);
    end if;
  end loop;

  update public.workout_plan_days
  set position = position + 100000
  where plan_id = v_plan_id;

  delete from public.workout_plan_days
  where plan_id = v_plan_id
    and not (id = any (v_kept_ids));

  for v_day in select value from jsonb_array_elements(p_days)
  loop
    v_position := v_position + 1;

    if coalesce(v_day->>'id', '') <> '' then
      v_day_id := (v_day->>'id')::uuid;
      update public.workout_plan_days
      set
        name = trim(v_day->>'name'),
        position = v_position
      where id = v_day_id and plan_id = v_plan_id;

      delete from public.workout_plan_day_exercises
      where plan_day_id = v_day_id;
    else
      insert into public.workout_plan_days (plan_id, name, position)
      values (v_plan_id, trim(v_day->>'name'), v_position)
      returning id into v_day_id;
    end if;

    v_exercise_position := 0;
    for v_exercise in
      select value
      from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
    loop
      if coalesce(v_exercise->>'exercise_id', '') = '' then
        raise exception 'Please choose an exercise for each row.';
      end if;

      v_exercise_position := v_exercise_position + 1;
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
      values (
        v_day_id,
        (v_exercise->>'exercise_id')::uuid,
        v_exercise_position,
        (v_exercise->>'target_sets')::integer,
        (v_exercise->>'target_reps')::integer,
        (v_exercise->>'target_weight_kg')::numeric,
        (v_exercise->>'base_weight_kg')::numeric,
        nullif(trim(coalesce(v_exercise->>'notes', '')), '')
      );
    end loop;
  end loop;

  return v_plan_id;
exception
  when unique_violation then
    if sqlerrm ilike '%workout_plans_user_lower_name_uniq%' then
      raise exception 'A plan with this name already exists.';
    end if;
    if sqlerrm ilike '%workout_plans_one_active_per_user%' then
      raise exception 'Another plan is already active. Try again.';
    end if;
    raise;
end;
$$;

alter function public.save_workout_plan(uuid, text, text, boolean, jsonb, uuid) owner to postgres;

revoke all on function public.save_workout_plan(uuid, text, text, boolean, jsonb, uuid) from public;
grant execute on function public.save_workout_plan(uuid, text, text, boolean, jsonb, uuid) to authenticated;
grant execute on function public.save_workout_plan(uuid, text, text, boolean, jsonb, uuid) to service_role;
