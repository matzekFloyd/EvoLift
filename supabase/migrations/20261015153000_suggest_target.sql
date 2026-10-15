alter table public.user_exercise_defaults
  add column if not exists suggest_target boolean not null default true;

comment on column public.user_exercise_defaults.suggest_target is
  'When false, this exercise does not show a suggested target. Missing rows stay on.';
