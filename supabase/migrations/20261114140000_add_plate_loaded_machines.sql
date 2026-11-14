-- Plate-loaded machines are separate exercises from pin-loaded ones.
-- Loaded (kg) is the plate weight, the same as every other exercise.
-- Also adds the pin-loaded machine shoulder press, which was missing.

insert into public.exercises (slug, primary_muscle_area, secondary_muscle_area)
values
  ('machine-shoulder-press', 'shoulders', 'triceps'),
  ('plate-loaded-chest-press', 'chest', 'triceps'),
  ('plate-loaded-hip-thrust', 'glutes', 'hamstrings'),
  ('plate-loaded-incline-chest-press', 'chest', 'triceps'),
  ('plate-loaded-lat-pulldown', 'back', 'biceps'),
  ('plate-loaded-leg-press', 'quads', 'glutes'),
  ('plate-loaded-seated-calf-raise', 'calves', null),
  ('plate-loaded-seated-row', 'back', 'biceps'),
  ('plate-loaded-shoulder-press', 'shoulders', 'triceps'),
  ('plate-loaded-standing-calf-raise', 'calves', null),
  ('plate-loaded-belt-squat', 'quads', 'glutes'),
  ('plate-loaded-biceps-curl', 'biceps', null),
  ('plate-loaded-chest-supported-row', 'back', 'biceps'),
  ('plate-loaded-chest-supported-t-bar-row', 'back', 'biceps'),
  ('plate-loaded-decline-chest-press', 'chest', 'triceps'),
  ('plate-loaded-dip', 'chest', 'triceps'),
  ('plate-loaded-hack-squat', 'quads', 'glutes'),
  ('plate-loaded-high-row', 'back', 'biceps'),
  ('plate-loaded-low-row', 'back', 'biceps'),
  ('plate-loaded-pendulum-squat', 'quads', 'glutes'),
  ('plate-loaded-preacher-curl', 'biceps', null),
  ('plate-loaded-pullover', 'back', null),
  ('plate-loaded-shrug', 'back', null),
  ('plate-loaded-single-arm-lat-pulldown', 'back', 'biceps'),
  ('plate-loaded-tibia-raise', 'calves', null),
  ('plate-loaded-v-squat', 'quads', 'glutes')
on conflict (slug) do update
set
  primary_muscle_area = excluded.primary_muscle_area,
  secondary_muscle_area = excluded.secondary_muscle_area;

with translation_seed(slug, lang_code, name) as (
  values
    ('machine-shoulder-press', 'en'::public.language_code, 'Machine Shoulder Press'),
    ('machine-shoulder-press', 'de'::public.language_code, 'Schulterdruecken an der Maschine'),
    ('plate-loaded-chest-press', 'en'::public.language_code, 'Plate-Loaded Chest Press'),
    ('plate-loaded-chest-press', 'de'::public.language_code, 'Scheibengeladene Brustpresse'),
    ('plate-loaded-hip-thrust', 'en'::public.language_code, 'Plate-Loaded Hip Thrust'),
    ('plate-loaded-hip-thrust', 'de'::public.language_code, 'Scheibengeladener Hip Thrust'),
    ('plate-loaded-incline-chest-press', 'en'::public.language_code, 'Plate-Loaded Incline Chest Press'),
    ('plate-loaded-incline-chest-press', 'de'::public.language_code, 'Scheibengeladene Schraegbank-Brustpresse'),
    ('plate-loaded-lat-pulldown', 'en'::public.language_code, 'Plate-Loaded Lat Pulldown'),
    ('plate-loaded-lat-pulldown', 'de'::public.language_code, 'Scheibengeladener Latzug'),
    ('plate-loaded-leg-press', 'en'::public.language_code, 'Plate-Loaded Leg Press'),
    ('plate-loaded-leg-press', 'de'::public.language_code, 'Scheibengeladene Beinpresse'),
    ('plate-loaded-seated-calf-raise', 'en'::public.language_code, 'Plate-Loaded Seated Calf Raise'),
    ('plate-loaded-seated-calf-raise', 'de'::public.language_code, 'Scheibengeladenes sitzendes Wadenheben'),
    ('plate-loaded-seated-row', 'en'::public.language_code, 'Plate-Loaded Seated Row'),
    ('plate-loaded-seated-row', 'de'::public.language_code, 'Scheibengeladenes sitzendes Rudern'),
    ('plate-loaded-shoulder-press', 'en'::public.language_code, 'Plate-Loaded Shoulder Press'),
    ('plate-loaded-shoulder-press', 'de'::public.language_code, 'Scheibengeladenes Schulterdruecken'),
    ('plate-loaded-standing-calf-raise', 'en'::public.language_code, 'Plate-Loaded Standing Calf Raise'),
    ('plate-loaded-standing-calf-raise', 'de'::public.language_code, 'Scheibengeladenes stehendes Wadenheben'),
    ('plate-loaded-belt-squat', 'en'::public.language_code, 'Plate-Loaded Belt Squat'),
    ('plate-loaded-belt-squat', 'de'::public.language_code, 'Scheibengeladene Guertelkniebeuge'),
    ('plate-loaded-biceps-curl', 'en'::public.language_code, 'Plate-Loaded Biceps Curl'),
    ('plate-loaded-biceps-curl', 'de'::public.language_code, 'Scheibengeladener Bizepscurl'),
    ('plate-loaded-chest-supported-row', 'en'::public.language_code, 'Plate-Loaded Chest-Supported Row'),
    ('plate-loaded-chest-supported-row', 'de'::public.language_code, 'Scheibengeladenes brustgestuetztes Rudern'),
    ('plate-loaded-chest-supported-t-bar-row', 'en'::public.language_code, 'Plate-Loaded Chest-Supported T-Bar Row'),
    ('plate-loaded-chest-supported-t-bar-row', 'de'::public.language_code, 'Scheibengeladenes brustgestuetztes T-Stangen-Rudern'),
    ('plate-loaded-decline-chest-press', 'en'::public.language_code, 'Plate-Loaded Decline Chest Press'),
    ('plate-loaded-decline-chest-press', 'de'::public.language_code, 'Scheibengeladene Negativbank-Brustpresse'),
    ('plate-loaded-dip', 'en'::public.language_code, 'Plate-Loaded Dip'),
    ('plate-loaded-dip', 'de'::public.language_code, 'Scheibengeladener Dip'),
    ('plate-loaded-hack-squat', 'en'::public.language_code, 'Plate-Loaded Hack Squat'),
    ('plate-loaded-hack-squat', 'de'::public.language_code, 'Scheibengeladene Hack Squats'),
    ('plate-loaded-high-row', 'en'::public.language_code, 'Plate-Loaded High Row'),
    ('plate-loaded-high-row', 'de'::public.language_code, 'Scheibengeladenes hohes Rudern'),
    ('plate-loaded-low-row', 'en'::public.language_code, 'Plate-Loaded Low Row'),
    ('plate-loaded-low-row', 'de'::public.language_code, 'Scheibengeladenes tiefes Rudern'),
    ('plate-loaded-pendulum-squat', 'en'::public.language_code, 'Plate-Loaded Pendulum Squat'),
    ('plate-loaded-pendulum-squat', 'de'::public.language_code, 'Scheibengeladene Pendulum-Kniebeuge'),
    ('plate-loaded-preacher-curl', 'en'::public.language_code, 'Plate-Loaded Preacher Curl'),
    ('plate-loaded-preacher-curl', 'de'::public.language_code, 'Scheibengeladener Preacher-Curl'),
    ('plate-loaded-pullover', 'en'::public.language_code, 'Plate-Loaded Pullover'),
    ('plate-loaded-pullover', 'de'::public.language_code, 'Scheibengeladener Pullover'),
    ('plate-loaded-shrug', 'en'::public.language_code, 'Plate-Loaded Shrug'),
    ('plate-loaded-shrug', 'de'::public.language_code, 'Scheibengeladenes Schulterzucken'),
    ('plate-loaded-single-arm-lat-pulldown', 'en'::public.language_code, 'Plate-Loaded Single-Arm Lat Pulldown'),
    ('plate-loaded-single-arm-lat-pulldown', 'de'::public.language_code, 'Scheibengeladener einarmiger Latzug'),
    ('plate-loaded-tibia-raise', 'en'::public.language_code, 'Plate-Loaded Tibia Raise'),
    ('plate-loaded-tibia-raise', 'de'::public.language_code, 'Scheibengeladenes Schienbeinheben'),
    ('plate-loaded-v-squat', 'en'::public.language_code, 'Plate-Loaded V-Squat'),
    ('plate-loaded-v-squat', 'de'::public.language_code, 'Scheibengeladene V-Kniebeuge')
)
insert into public.exercise_translations (exercise_id, lang_code, name)
select e.id, ts.lang_code, ts.name
from translation_seed ts
join public.exercises e
  on e.slug = ts.slug
on conflict (exercise_id, lang_code) do update
set name = excluded.name;
