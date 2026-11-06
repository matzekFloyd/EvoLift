alter table public.user_exercise_defaults
  add column if not exists double_progression boolean;

comment on column public.user_exercise_defaults.double_progression is
  'Null follows the account double-progression switch. True or false overrides it for this exercise.';
