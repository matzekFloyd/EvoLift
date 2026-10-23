-- Tag every catalog exercise with one primary muscle area and an optional secondary.
-- The enum is the only vocabulary. A value outside it is rejected.

create type public.muscle_area as enum (
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core'
);

comment on type public.muscle_area is
  'The only muscle areas: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, and Core.';

alter table public.exercises
  add column primary_muscle_area public.muscle_area,
  add column secondary_muscle_area public.muscle_area;

comment on column public.exercises.primary_muscle_area is
  'The area the lift is for. Required.';

comment on column public.exercises.secondary_muscle_area is
  'The other area a lifter would still count. Empty for most isolations. Must differ from the primary. There is no third area.';

update public.exercises as exercise
set
  primary_muscle_area = seed.primary_muscle_area::public.muscle_area,
  secondary_muscle_area = seed.secondary_muscle_area::public.muscle_area
from (
  values
  ('arnold-press', 'shoulders', 'triceps'),
  ('assisted-dip', 'chest', 'triceps'),
  ('assisted-pull-up', 'back', 'biceps'),
  ('back-extension', 'back', 'glutes'),
  ('back-squat', 'quads', 'glutes'),
  ('barbell-bench-press', 'chest', 'triceps'),
  ('barbell-bent-over-row', 'back', 'biceps'),
  ('barbell-curl', 'biceps', null),
  ('barbell-hip-thrust', 'glutes', 'hamstrings'),
  ('barbell-incline-press', 'chest', 'triceps'),
  ('barbell-romanian-deadlift', 'hamstrings', 'glutes'),
  ('bent-over-reverse-dumbbell-flye', 'shoulders', null),
  ('bicycle-crunch', 'core', null),
  ('bulgarian-split-squat', 'quads', 'glutes'),
  ('cable-crunch', 'core', null),
  ('cable-curl', 'biceps', null),
  ('cable-flye', 'chest', null),
  ('cable-lateral-raise', 'shoulders', null),
  ('cable-pull-through', 'glutes', 'hamstrings'),
  ('cable-reverse-flye', 'shoulders', null),
  ('cable-seated-row', 'back', 'biceps'),
  ('cable-tricep-kickback', 'triceps', null),
  ('cable-tricep-pushdown', 'triceps', null),
  ('chest-supported-row', 'back', 'biceps'),
  ('chest-supported-t-bar-row', 'back', 'biceps'),
  ('chin-up', 'back', 'biceps'),
  ('close-grip-bench-press', 'triceps', 'chest'),
  ('crunch', 'core', null),
  ('deadlift', 'hamstrings', 'back'),
  ('dumbbell-bench-press', 'chest', 'triceps'),
  ('dumbbell-floor-press', 'chest', 'triceps'),
  ('dumbbell-flye', 'chest', null),
  ('dumbbell-incline-press', 'chest', 'triceps'),
  ('dumbbell-lateral-raise', 'shoulders', null),
  ('dumbbell-overhead-press', 'shoulders', 'triceps'),
  ('dumbbell-romanian-deadlift', 'hamstrings', 'glutes'),
  ('dumbbell-row', 'back', 'biceps'),
  ('dumbbell-seated-shoulder-press', 'shoulders', 'triceps'),
  ('dumbbell-single-leg-hip-thrust', 'glutes', 'hamstrings'),
  ('dumbbell-skull-crusher', 'triceps', null),
  ('dumbbell-supinated-curl', 'biceps', null),
  ('dumbbell-walking-lunge', 'quads', 'glutes'),
  ('ez-bar-curl', 'biceps', null),
  ('front-squat', 'quads', 'glutes'),
  ('glute-bridge', 'glutes', 'hamstrings'),
  ('goblet-squat', 'quads', 'glutes'),
  ('hack-squat', 'quads', 'glutes'),
  ('hammer-curl', 'biceps', null),
  ('hanging-leg-raise', 'core', null),
  ('lat-pulldown', 'back', 'biceps'),
  ('leg-extension', 'quads', null),
  ('leg-press', 'quads', 'glutes'),
  ('lying-leg-curl', 'hamstrings', null),
  ('machine-chest-press', 'chest', 'triceps'),
  ('machine-incline-chest-press', 'chest', 'triceps'),
  ('machine-lateral-raise', 'shoulders', null),
  ('machine-seated-hip-abduction', 'glutes', null),
  ('neutral-grip-pulldown', 'back', 'biceps'),
  ('overhead-press', 'shoulders', 'triceps'),
  ('pallof-press', 'core', null),
  ('pec-deck', 'chest', null),
  ('plank', 'core', null),
  ('pull-up', 'back', 'biceps'),
  ('push-up', 'chest', 'triceps'),
  ('reverse-grip-lat-pulldown', 'back', 'biceps'),
  ('reverse-pec-deck', 'shoulders', null),
  ('seated-calf-raise', 'calves', null),
  ('seated-face-pull', 'shoulders', 'back'),
  ('seated-leg-curl', 'hamstrings', null),
  ('single-arm-cable-curl', 'biceps', null),
  ('single-arm-pulldown', 'back', 'biceps'),
  ('single-arm-rope-tricep-extension', 'triceps', null),
  ('single-leg-leg-extension', 'quads', null),
  ('single-leg-lying-leg-curl', 'hamstrings', null),
  ('standing-calf-raise', 'calves', null),
  ('sumo-deadlift', 'hamstrings', 'back'),
  ('trap-bar-deadlift', 'hamstrings', 'back')
) as seed(slug, primary_muscle_area, secondary_muscle_area)
where exercise.slug = seed.slug;

do $$
declare
  missing text;
begin
  select string_agg(slug, ', ' order by slug)
  into missing
  from public.exercises
  where primary_muscle_area is null;

  if missing is not null then
    raise exception 'Every catalog exercise needs a primary muscle area. Missing: %', missing;
  end if;
end
$$;

alter table public.exercises
  alter column primary_muscle_area set not null;

alter table public.exercises
  add constraint exercises_secondary_muscle_area_differs_chk
  check (
    secondary_muscle_area is null
    or secondary_muscle_area <> primary_muscle_area
  );
