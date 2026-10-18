-- Move the suggested warmup set cap from account-wide profile metrics onto
-- per-exercise defaults so each lift can keep its own ladder length.

alter table public.user_exercise_defaults
  add column if not exists max_suggested_warmup_sets integer;

alter table public.user_exercise_defaults
  drop constraint if exists user_exercise_defaults_max_suggested_warmup_sets_chk;

alter table public.user_exercise_defaults
  add constraint user_exercise_defaults_max_suggested_warmup_sets_chk
  check (max_suggested_warmup_sets is null or max_suggested_warmup_sets > 0);

comment on column public.user_exercise_defaults.max_suggested_warmup_sets is
  'Optional cap on suggested warmup sets for this exercise. Null keeps the full ladder.';

update public.user_exercise_defaults as defaults
set max_suggested_warmup_sets = metrics.max_suggested_warmup_sets
from public.user_profile_metrics as metrics
where defaults.user_id = metrics.user_id
  and metrics.max_suggested_warmup_sets is not null
  and defaults.max_suggested_warmup_sets is null;

alter table public.user_profile_metrics
  drop constraint if exists user_profile_metrics_max_suggested_warmup_sets_chk;

alter table public.user_profile_metrics
  drop column if exists max_suggested_warmup_sets;
