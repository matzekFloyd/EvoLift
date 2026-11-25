alter table public.user_exercise_defaults
  add column if not exists progression_increment_kg numeric(6,2);

alter table public.user_exercise_defaults
  drop constraint if exists user_exercise_defaults_progression_increment_chk;

alter table public.user_exercise_defaults
  add constraint user_exercise_defaults_progression_increment_chk
  check (
    progression_increment_kg is null
    or (
      progression_increment_kg > 0
      and progression_increment_kg <= 9999.99
    )
  );

comment on column public.user_exercise_defaults.progression_increment_kg is
  'Kilograms added or removed when double progression changes the load. Null keeps the load-based step.';
