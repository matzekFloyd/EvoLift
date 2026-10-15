alter table public.user_profile_metrics
  add column if not exists max_suggested_warmup_sets integer;

alter table public.user_profile_metrics
  drop constraint if exists user_profile_metrics_max_suggested_warmup_sets_chk;

alter table public.user_profile_metrics
  add constraint user_profile_metrics_max_suggested_warmup_sets_chk
  check (max_suggested_warmup_sets is null or max_suggested_warmup_sets > 0);

comment on column public.user_profile_metrics.max_suggested_warmup_sets is
  'Optional cap on suggested warmup sets for every exercise. Null keeps the full ladder.';

alter table public.user_exercise_defaults
  add column if not exists suggest_warmups boolean not null default true;

comment on column public.user_exercise_defaults.suggest_warmups is
  'When false, this exercise does not show a warmup suggestion. Missing rows stay on.';
