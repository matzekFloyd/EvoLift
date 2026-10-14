create table "public"."workout_plans" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "notes" text,
  "is_active" boolean default false not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "workout_plans_pkey" primary key ("id"),
  constraint "workout_plans_name_nonempty_chk"
    check (length(trim(both from "name")) > 0),
  constraint "workout_plans_user_id_fkey"
    foreign key ("user_id") references "auth"."users"("id") on delete cascade
);

create unique index "workout_plans_user_lower_name_uniq"
  on "public"."workout_plans" using btree ("user_id", lower("name"));

create unique index "workout_plans_one_active_per_user"
  on "public"."workout_plans" using btree ("user_id")
  where "is_active";

create index "idx_workout_plans_user"
  on "public"."workout_plans" using btree ("user_id");

create trigger "trg_workout_plans_set_updated_at"
before update on "public"."workout_plans"
for each row execute function "public"."set_updated_at"();

create or replace function "public"."enforce_single_active_workout_plan"()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if new.is_active then
    update "public"."workout_plans"
    set "is_active" = false
    where "user_id" = new.user_id
      and "id" is distinct from new.id
      and "is_active" = true;
  end if;
  return new;
end;
$$;

alter function "public"."enforce_single_active_workout_plan"() owner to postgres;

revoke all on function "public"."enforce_single_active_workout_plan"() from public;

create trigger "trg_workout_plans_single_active"
before insert or update on "public"."workout_plans"
for each row execute function "public"."enforce_single_active_workout_plan"();

create table "public"."workout_plan_days" (
  "id" uuid default gen_random_uuid() not null,
  "plan_id" uuid not null,
  "name" text not null,
  "position" integer not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "workout_plan_days_pkey" primary key ("id"),
  constraint "workout_plan_days_name_nonempty_chk"
    check (length(trim(both from "name")) > 0),
  constraint "workout_plan_days_position_chk" check (("position" > 0)),
  constraint "workout_plan_days_plan_position_uniq" unique ("plan_id", "position"),
  constraint "workout_plan_days_plan_id_fkey"
    foreign key ("plan_id") references "public"."workout_plans"("id") on delete cascade
);

create index "idx_workout_plan_days_plan_position"
  on "public"."workout_plan_days" using btree ("plan_id", "position");

create trigger "trg_workout_plan_days_set_updated_at"
before update on "public"."workout_plan_days"
for each row execute function "public"."set_updated_at"();

create table "public"."workout_plan_day_exercises" (
  "id" uuid default gen_random_uuid() not null,
  "plan_day_id" uuid not null,
  "exercise_id" uuid not null,
  "position" integer not null,
  "target_sets" integer,
  "target_reps" integer,
  "target_weight_kg" numeric(6,2),
  "base_weight_kg" numeric(6,2),
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  constraint "workout_plan_day_exercises_pkey" primary key ("id"),
  constraint "workout_plan_day_exercises_position_chk" check (("position" > 0)),
  constraint "workout_plan_day_exercises_target_reps_chk"
    check ((("target_reps" is null) or ("target_reps" > 0))),
  constraint "workout_plan_day_exercises_target_sets_chk"
    check ((("target_sets" is null) or ("target_sets" > 0))),
  constraint "workout_plan_day_exercises_target_weight_chk"
    check ((("target_weight_kg" is null) or ("target_weight_kg" >= (0)::numeric))),
  constraint "workout_plan_day_exercises_base_weight_chk"
    check ((("base_weight_kg" is null) or ("base_weight_kg" >= (0)::numeric))),
  constraint "workout_plan_day_exercises_day_position_uniq"
    unique ("plan_day_id", "position"),
  constraint "workout_plan_day_exercises_plan_day_id_fkey"
    foreign key ("plan_day_id") references "public"."workout_plan_days"("id") on delete cascade,
  constraint "workout_plan_day_exercises_exercise_id_fkey"
    foreign key ("exercise_id") references "public"."exercises"("id") on delete restrict
);

create index "idx_workout_plan_day_exercises_day_position"
  on "public"."workout_plan_day_exercises" using btree ("plan_day_id", "position");

alter table "public"."workout_sessions"
  add column "plan_id" uuid
    references "public"."workout_plans"("id") on delete set null,
  add column "plan_day_id" uuid
    references "public"."workout_plan_days"("id") on delete set null;

create index "idx_workout_sessions_plan"
  on "public"."workout_sessions" using btree ("plan_id")
  where ("plan_id" is not null);

create index "idx_workout_sessions_plan_day"
  on "public"."workout_sessions" using btree ("plan_day_id")
  where ("plan_day_id" is not null);

alter table "public"."workout_plans" enable row level security;

create policy "workout_plans_owner_all"
on "public"."workout_plans"
to "authenticated"
using (("user_id" = "auth"."uid"()))
with check (("user_id" = "auth"."uid"()));

alter table "public"."workout_plan_days" enable row level security;

create policy "workout_plan_days_owner_all"
on "public"."workout_plan_days"
to "authenticated"
using (
  (exists (
    select 1
    from "public"."workout_plans" "wp"
    where (("wp"."id" = "workout_plan_days"."plan_id") and ("wp"."user_id" = "auth"."uid"()))
  ))
)
with check (
  (exists (
    select 1
    from "public"."workout_plans" "wp"
    where (("wp"."id" = "workout_plan_days"."plan_id") and ("wp"."user_id" = "auth"."uid"()))
  ))
);

alter table "public"."workout_plan_day_exercises" enable row level security;

create policy "workout_plan_day_exercises_owner_all"
on "public"."workout_plan_day_exercises"
to "authenticated"
using (
  (exists (
    select 1
    from "public"."workout_plan_days" "d"
    join "public"."workout_plans" "wp" on "wp"."id" = "d"."plan_id"
    where (("d"."id" = "workout_plan_day_exercises"."plan_day_id") and ("wp"."user_id" = "auth"."uid"()))
  ))
)
with check (
  (exists (
    select 1
    from "public"."workout_plan_days" "d"
    join "public"."workout_plans" "wp" on "wp"."id" = "d"."plan_id"
    where (("d"."id" = "workout_plan_day_exercises"."plan_day_id") and ("wp"."user_id" = "auth"."uid"()))
  ))
);

grant all on table "public"."workout_plans" to "anon";
grant all on table "public"."workout_plans" to "authenticated";
grant all on table "public"."workout_plans" to "service_role";

grant all on table "public"."workout_plan_days" to "anon";
grant all on table "public"."workout_plan_days" to "authenticated";
grant all on table "public"."workout_plan_days" to "service_role";

grant all on table "public"."workout_plan_day_exercises" to "anon";
grant all on table "public"."workout_plan_day_exercises" to "authenticated";
grant all on table "public"."workout_plan_day_exercises" to "service_role";

create or replace function "public"."save_workout_plan"(
  "p_plan_id" uuid,
  "p_name" text,
  "p_notes" text,
  "p_is_active" boolean,
  "p_days" jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
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
  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  v_name := trim(coalesce("p_name", ''));
  if length(v_name) = 0 then
    raise exception 'Please enter a plan name.';
  end if;
  if length(v_name) > 120 then
    raise exception 'Plan name cannot be longer than 120 characters.';
  end if;

  v_notes := nullif(trim(coalesce("p_notes", '')), '');
  if v_notes is not null and length(v_notes) > 500 then
    raise exception 'Plan notes cannot be longer than 500 characters.';
  end if;

  if "p_days" is null or jsonb_typeof("p_days") <> 'array' then
    raise exception 'Please provide the plan days.';
  end if;

  if "p_plan_id" is null then
    insert into "public"."workout_plans" ("user_id", "name", "notes", "is_active")
    values (v_user_id, v_name, v_notes, coalesce("p_is_active", false))
    returning "id" into v_plan_id;
  else
    update "public"."workout_plans"
    set
      "name" = v_name,
      "notes" = v_notes,
      "is_active" = coalesce("p_is_active", false)
    where "id" = "p_plan_id" and "user_id" = v_user_id
    returning "id" into v_plan_id;

    if v_plan_id is null then
      raise exception 'Plan not found.';
    end if;
  end if;

  for v_day in select value from jsonb_array_elements("p_days")
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
        from "public"."workout_plan_days" "d"
        where "d"."id" = v_existing_id and "d"."plan_id" = v_plan_id
      ) then
        raise exception 'That day is not part of this plan.';
      end if;
      v_kept_ids := array_append(v_kept_ids, v_existing_id);
    end if;
  end loop;

  update "public"."workout_plan_days"
  set "position" = "position" + 100000
  where "plan_id" = v_plan_id;

  delete from "public"."workout_plan_days"
  where "plan_id" = v_plan_id
    and not ("id" = any (v_kept_ids));

  for v_day in select value from jsonb_array_elements("p_days")
  loop
    v_position := v_position + 1;

    if coalesce(v_day->>'id', '') <> '' then
      v_day_id := (v_day->>'id')::uuid;
      update "public"."workout_plan_days"
      set
        "name" = trim(v_day->>'name'),
        "position" = v_position
      where "id" = v_day_id and "plan_id" = v_plan_id;

      delete from "public"."workout_plan_day_exercises"
      where "plan_day_id" = v_day_id;
    else
      insert into "public"."workout_plan_days" ("plan_id", "name", "position")
      values (v_plan_id, trim(v_day->>'name'), v_position)
      returning "id" into v_day_id;
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
      insert into "public"."workout_plan_day_exercises" (
        "plan_day_id",
        "exercise_id",
        "position",
        "target_sets",
        "target_reps",
        "target_weight_kg",
        "base_weight_kg",
        "notes"
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

alter function "public"."save_workout_plan"(uuid, text, text, boolean, jsonb) owner to postgres;

revoke all on function "public"."save_workout_plan"(uuid, text, text, boolean, jsonb) from public;
grant execute on function "public"."save_workout_plan"(uuid, text, text, boolean, jsonb) to "authenticated";
grant execute on function "public"."save_workout_plan"(uuid, text, text, boolean, jsonb) to "service_role";
