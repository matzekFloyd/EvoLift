-- Import a validated account file in one transaction.
-- The app checks the file first. This function only writes, and a failure rolls back.

create or replace function public.import_account_transfer(
  p_user_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path to public
as $$
declare
  v_user_id uuid;
  v_mode text;
  v_profile jsonb;
  v_item jsonb;
  v_day jsonb;
  v_exercise jsonb;
  v_set jsonb;
  v_template_id uuid;
  v_plan_id uuid;
  v_day_id uuid;
  v_session_id uuid;
  v_session_exercise_id uuid;
  v_template_ids jsonb := '{}'::jsonb;
  v_plan_ids jsonb := '{}'::jsonb;
  v_day_ids jsonb := '{}'::jsonb;
  v_position integer;
  v_exercise_position integer;
  v_bodyweight_inserted boolean := false;
  v_ref text;
begin
  if auth.uid() is not null then
    v_user_id := auth.uid();
  elsif current_user in ('service_role', 'postgres') then
    v_user_id := p_user_id;
  else
    raise exception 'You must be logged in.';
  end if;

  if v_user_id is null or jsonb_typeof(p_payload) is distinct from 'object' then
    raise exception 'This file is not an EvoLift account export.';
  end if;

  v_mode := p_payload->>'mode';
  if v_mode not in ('add', 'replace') then
    raise exception 'Choose add or replace.';
  end if;

  if v_mode = 'replace' then
    delete from public.workout_sessions where user_id = v_user_id;
    delete from public.workout_templates where user_id = v_user_id;
    delete from public.workout_plans where user_id = v_user_id;
    delete from public.strength_milestones where user_id = v_user_id;
    delete from public.user_bodyweight_log where user_id = v_user_id;
    delete from public.user_exercise_defaults where user_id = v_user_id;
    delete from public.user_hidden_exercises where user_id = v_user_id;
  end if;

  v_profile := coalesce(p_payload->'profile', '{}'::jsonb);
  if coalesce((v_profile->>'write')::boolean, false) then
    insert into public.user_profile_metrics (
      user_id,
      bodyweight_kg,
      height_cm,
      sex,
      date_of_birth,
      birth_year
    )
    values (
      v_user_id,
      (v_profile->>'bodyweight_kg')::numeric,
      (v_profile->>'height_cm')::numeric,
      (v_profile->>'sex')::public.profile_sex,
      (v_profile->>'date_of_birth')::date,
      case
        when v_profile->>'date_of_birth' is null then null
        else extract(year from (v_profile->>'date_of_birth')::date)::integer
      end
    )
    on conflict (user_id) do update
    set
      bodyweight_kg = excluded.bodyweight_kg,
      height_cm = excluded.height_cm,
      sex = excluded.sex,
      date_of_birth = excluded.date_of_birth,
      birth_year = excluded.birth_year;
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'bodyweight', '[]'::jsonb))
  loop
    insert into public.user_bodyweight_log (user_id, logged_on, bodyweight_kg)
    values (
      v_user_id,
      (v_item->>'logged_on')::date,
      (v_item->>'bodyweight_kg')::numeric
    );
    v_bodyweight_inserted := true;
  end loop;

  if (v_mode = 'replace' or v_bodyweight_inserted)
     and exists (
       select 1 from public.user_bodyweight_log where user_id = v_user_id
     ) then
    insert into public.user_profile_metrics (user_id, bodyweight_kg)
    values (
      v_user_id,
      (
        select bodyweight_kg
        from public.user_bodyweight_log
        where user_id = v_user_id
        order by logged_on desc
        limit 1
      )
    )
    on conflict (user_id) do update
    set bodyweight_kg = excluded.bodyweight_kg;
  end if;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'hidden_exercise_ids', '[]'::jsonb))
  loop
    insert into public.user_hidden_exercises (user_id, exercise_id)
    values (v_user_id, (v_item #>> '{}')::uuid);
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'defaults', '[]'::jsonb))
  loop
    insert into public.user_exercise_defaults (
      user_id,
      exercise_id,
      default_base_weight_kg,
      default_target_sets,
      default_target_reps,
      default_target_weight_kg,
      suggest_warmups,
      suggest_target,
      max_suggested_warmup_sets
    )
    values (
      v_user_id,
      (v_item->>'exercise_id')::uuid,
      (v_item->>'default_base_weight_kg')::numeric,
      (v_item->>'default_target_sets')::integer,
      (v_item->>'default_target_reps')::integer,
      (v_item->>'default_target_weight_kg')::numeric,
      coalesce((v_item->>'suggest_warmups')::boolean, true),
      coalesce((v_item->>'suggest_target')::boolean, true),
      (v_item->>'max_suggested_warmup_sets')::integer
    );
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'templates', '[]'::jsonb))
  loop
    insert into public.workout_templates (user_id, name, notes)
    values (v_user_id, v_item->>'name', nullif(v_item->>'notes', ''))
    returning id into v_template_id;
    v_template_ids := v_template_ids || jsonb_build_object(v_item->>'ref', v_template_id);
    v_position := 0;
    for v_exercise in
      select value from jsonb_array_elements(coalesce(v_item->'exercises', '[]'::jsonb))
    loop
      v_position := v_position + 1;
      insert into public.workout_template_exercises (
        template_id,
        exercise_id,
        position,
        target_sets,
        target_reps,
        target_weight_kg,
        base_weight_kg,
        notes
      )
      values (
        v_template_id,
        (v_exercise->>'exercise_id')::uuid,
        v_position,
        (v_exercise->>'target_sets')::integer,
        (v_exercise->>'target_reps')::integer,
        (v_exercise->>'target_weight_kg')::numeric,
        (v_exercise->>'base_weight_kg')::numeric,
        nullif(v_exercise->>'notes', '')
      );
    end loop;
    if v_position = 0 then
      raise exception 'A template has no exercises.';
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'plans', '[]'::jsonb))
  loop
    insert into public.workout_plans (user_id, name, notes, is_active)
    values (
      v_user_id,
      v_item->>'name',
      nullif(v_item->>'notes', ''),
      coalesce((v_item->>'active')::boolean, false)
    )
    returning id into v_plan_id;
    v_plan_ids := v_plan_ids || jsonb_build_object(v_item->>'ref', v_plan_id);
    v_position := 0;
    for v_day in
      select value from jsonb_array_elements(coalesce(v_item->'days', '[]'::jsonb))
    loop
      v_position := v_position + 1;
      insert into public.workout_plan_days (plan_id, name, position)
      values (v_plan_id, v_day->>'name', v_position)
      returning id into v_day_id;
      v_day_ids := v_day_ids || jsonb_build_object(v_day->>'ref', v_day_id);
      v_exercise_position := 0;
      for v_exercise in
        select value from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
      loop
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
          nullif(v_exercise->>'notes', '')
        );
      end loop;
      if v_exercise_position = 0 then
        raise exception 'A plan day has no exercises.';
      end if;
    end loop;
    if v_position = 0 then
      raise exception 'A plan has no days.';
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'sessions', '[]'::jsonb))
  loop
    v_template_id := null;
    v_plan_id := null;
    v_day_id := null;
    v_ref := nullif(v_item->>'template_ref', '');
    if v_ref is not null then
      v_template_id := (v_template_ids->>v_ref)::uuid;
      if v_template_id is null then
        raise exception 'The file refers to a template that is not in the file.';
      end if;
    end if;
    v_ref := nullif(v_item->>'plan_ref', '');
    if v_ref is not null then
      v_plan_id := (v_plan_ids->>v_ref)::uuid;
      if v_plan_id is null then
        raise exception 'The file refers to a plan that is not in the file.';
      end if;
    end if;
    v_ref := nullif(v_item->>'plan_day_ref', '');
    if v_ref is not null then
      v_day_id := (v_day_ids->>v_ref)::uuid;
      if v_day_id is null then
        raise exception 'The file refers to a plan day that is not in the file.';
      end if;
    end if;

    insert into public.workout_sessions (
      user_id,
      performed_on,
      notes,
      source_template_id,
      plan_id,
      plan_day_id,
      started_at,
      completed_at
    )
    values (
      v_user_id,
      (v_item->>'performed_on')::date,
      nullif(v_item->>'notes', ''),
      v_template_id,
      v_plan_id,
      v_day_id,
      (v_item->>'started_at')::timestamptz,
      (v_item->>'completed_at')::timestamptz
    )
    returning id into v_session_id;

    v_position := 0;
    for v_exercise in
      select value from jsonb_array_elements(coalesce(v_item->'exercises', '[]'::jsonb))
    loop
      v_position := v_position + 1;
      insert into public.workout_session_exercises (
        session_id,
        exercise_id,
        position,
        base_weight_kg,
        target_sets,
        target_reps,
        target_weight_kg,
        notes,
        not_done
      )
      values (
        v_session_id,
        (v_exercise->>'exercise_id')::uuid,
        v_position,
        (v_exercise->>'base_weight_kg')::numeric,
        (v_exercise->>'target_sets')::integer,
        (v_exercise->>'target_reps')::integer,
        (v_exercise->>'target_weight_kg')::numeric,
        nullif(v_exercise->>'notes', ''),
        coalesce((v_exercise->>'not_done')::boolean, false)
      )
      returning id into v_session_exercise_id;

      for v_set in
        select value from jsonb_array_elements(coalesce(v_exercise->'sets', '[]'::jsonb))
      loop
        insert into public.workout_sets (
          session_exercise_id,
          set_number,
          reps,
          weight_kg,
          is_warmup,
          performed_at,
          notes
        )
        values (
          v_session_exercise_id,
          (v_set->>'set_number')::integer,
          (v_set->>'reps')::integer,
          (v_set->>'weight_kg')::numeric,
          coalesce((v_set->>'is_warmup')::boolean, false),
          (v_set->>'performed_at')::timestamptz,
          nullif(v_set->>'notes', '')
        );
      end loop;
    end loop;
    if v_position = 0 then
      raise exception 'A session has no exercises.';
    end if;
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_payload->'goals', '[]'::jsonb))
  loop
    insert into public.strength_milestones (
      user_id,
      exercise_id,
      milestone_type,
      target_weight_kg,
      bodyweight_multiple,
      min_reps,
      due_on,
      note,
      achieved_at,
      achieved_bodyweight_kg,
      achieved_threshold_kg
    )
    values (
      v_user_id,
      (v_item->>'exercise_id')::uuid,
      (v_item->>'milestone_type')::public.strength_milestone_type,
      (v_item->>'target_weight_kg')::numeric,
      (v_item->>'bodyweight_multiple')::numeric,
      coalesce((v_item->>'min_reps')::integer, 1),
      (v_item->>'due_on')::date,
      nullif(v_item->>'note', ''),
      (v_item->>'achieved_at')::timestamptz,
      (v_item->>'achieved_bodyweight_kg')::numeric,
      (v_item->>'achieved_threshold_kg')::numeric
    );
  end loop;

  return jsonb_build_object('ok', true);
exception
  when unique_violation then
    if sqlerrm ilike '%workout_templates_user_lower_name_uniq%' then
      raise exception 'A template with this name is already in this account.';
    elsif sqlerrm ilike '%workout_plans_user_lower_name_uniq%' then
      raise exception 'A plan with this name is already in this account.';
    elsif sqlerrm ilike '%user_bodyweight_log_user_date_key%' then
      raise exception 'That date already has a bodyweight.';
    else
      raise exception 'This file conflicts with data already in this account.';
    end if;
  when check_violation then
    if sqlerrm ilike '%open workout session limit%' then
      raise exception 'You already have 3 open workout sessions. Finish one from Home before starting another.';
    end if;
    raise;
end;
$$;

alter function public.import_account_transfer(uuid, jsonb) owner to postgres;

revoke all on function public.import_account_transfer(uuid, jsonb) from public;
grant execute on function public.import_account_transfer(uuid, jsonb) to authenticated;
grant execute on function public.import_account_transfer(uuid, jsonb) to service_role;

comment on function public.import_account_transfer(uuid, jsonb) is
  'Adds or replaces the signed-in user''s workout data from a validated export. Password, API tokens, and the exercise catalog are left unchanged.';
