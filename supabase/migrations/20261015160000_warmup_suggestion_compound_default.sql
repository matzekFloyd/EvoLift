alter table public.user_exercise_defaults
  alter column suggest_warmups set default false;

comment on column public.user_exercise_defaults.suggest_warmups is
  'When false, this exercise does not show a warmup suggestion. A missing row stays on for compounds only.';

update public.user_exercise_defaults as defaults
set suggest_warmups = false
from public.exercises as exercise
where exercise.id = defaults.exercise_id
  and exercise.slug not in (
    'back-squat',
    'deadlift',
    'barbell-bench-press',
    'overhead-press',
    'barbell-bent-over-row',
    'romanian-deadlift',
    'close-grip-bench-press',
    'barbell-hip-thrust'
  );
