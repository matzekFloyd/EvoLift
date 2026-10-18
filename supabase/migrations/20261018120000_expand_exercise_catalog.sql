-- Expand the exercise catalog (EVO-220).
-- Safe for existing databases: rename keeps exercise ids; inserts are idempotent.

-- Split Romanian Deadlift into barbell vs dumbbell (history stays on the barbell row).
update public.exercises
set slug = 'barbell-romanian-deadlift'
where slug = 'romanian-deadlift';

with new_exercises(slug) as (
  values
    ('arnold-press'),
    ('assisted-pull-up'),
    ('back-extension'),
    ('barbell-curl'),
    ('barbell-incline-press'),
    ('barbell-romanian-deadlift'),
    ('bulgarian-split-squat'),
    ('cable-crunch'),
    ('cable-curl'),
    ('cable-pull-through'),
    ('cable-tricep-pushdown'),
    ('chin-up'),
    ('dumbbell-bench-press'),
    ('dumbbell-flye'),
    ('dumbbell-overhead-press'),
    ('dumbbell-romanian-deadlift'),
    ('front-squat'),
    ('glute-bridge'),
    ('hack-squat'),
    ('machine-chest-press'),
    ('machine-lateral-raise'),
    ('pallof-press'),
    ('pull-up'),
    ('push-up'),
    ('seated-calf-raise'),
    ('sumo-deadlift'),
    ('trap-bar-deadlift')
)
insert into public.exercises (slug)
select slug
from new_exercises
on conflict (slug) do nothing;

with translation_seed(slug, lang_code, name) as (
  values
    ('arnold-press', 'en'::public.language_code, 'Arnold Press'),
    ('arnold-press', 'de'::public.language_code, 'Arnold Press'),
    ('assisted-pull-up', 'en'::public.language_code, 'Assisted Pull-Up'),
    ('assisted-pull-up', 'de'::public.language_code, 'Unterstuetzter Klimmzug'),
    ('back-extension', 'en'::public.language_code, 'Back Extension'),
    ('back-extension', 'de'::public.language_code, 'Rueckenstrecker'),
    ('barbell-curl', 'en'::public.language_code, 'Barbell Curl'),
    ('barbell-curl', 'de'::public.language_code, 'Langhantel-Curl'),
    ('barbell-incline-press', 'en'::public.language_code, 'Barbell Incline Press'),
    ('barbell-incline-press', 'de'::public.language_code, 'Langhantel-Schraegbankdruecken'),
    ('barbell-romanian-deadlift', 'en'::public.language_code, 'Barbell Romanian Deadlift'),
    ('barbell-romanian-deadlift', 'de'::public.language_code, 'Rumaenisches Langhantel-Kreuzheben'),
    ('bulgarian-split-squat', 'en'::public.language_code, 'Bulgarian Split Squat'),
    ('bulgarian-split-squat', 'de'::public.language_code, 'Bulgarische Kniebeuge'),
    ('cable-crunch', 'en'::public.language_code, 'Cable Crunch'),
    ('cable-crunch', 'de'::public.language_code, 'Kabel-Crunch'),
    ('cable-curl', 'en'::public.language_code, 'Cable Curl'),
    ('cable-curl', 'de'::public.language_code, 'Kabel-Curl'),
    ('cable-pull-through', 'en'::public.language_code, 'Cable Pull-Through'),
    ('cable-pull-through', 'de'::public.language_code, 'Kabel Pull-Through'),
    ('cable-tricep-pushdown', 'en'::public.language_code, 'Cable Tricep Pushdown'),
    ('cable-tricep-pushdown', 'de'::public.language_code, 'Trizepsdruecken am Kabel'),
    ('chin-up', 'en'::public.language_code, 'Chin-Up'),
    ('chin-up', 'de'::public.language_code, 'Klimmzug im Untergriff'),
    ('dumbbell-bench-press', 'en'::public.language_code, 'Dumbbell Bench Press'),
    ('dumbbell-bench-press', 'de'::public.language_code, 'Kurzhantel-Bankdruecken'),
    ('dumbbell-flye', 'en'::public.language_code, 'Dumbbell Flye'),
    ('dumbbell-flye', 'de'::public.language_code, 'Kurzhantel-Flye'),
    ('dumbbell-overhead-press', 'en'::public.language_code, 'Dumbbell Overhead Press'),
    ('dumbbell-overhead-press', 'de'::public.language_code, 'Kurzhantel-Schulterdruecken'),
    ('dumbbell-romanian-deadlift', 'en'::public.language_code, 'Dumbbell Romanian Deadlift'),
    ('dumbbell-romanian-deadlift', 'de'::public.language_code, 'Rumaenisches Kurzhantel-Kreuzheben'),
    ('front-squat', 'en'::public.language_code, 'Front Squat'),
    ('front-squat', 'de'::public.language_code, 'Frontkniebeuge'),
    ('glute-bridge', 'en'::public.language_code, 'Glute Bridge'),
    ('glute-bridge', 'de'::public.language_code, 'Glute Bridge'),
    ('hack-squat', 'en'::public.language_code, 'Hack Squat'),
    ('hack-squat', 'de'::public.language_code, 'Hack Squats'),
    ('machine-chest-press', 'en'::public.language_code, 'Machine Chest Press'),
    ('machine-chest-press', 'de'::public.language_code, 'Brustpresse an der Maschine'),
    ('machine-lateral-raise', 'en'::public.language_code, 'Machine Lateral Raise'),
    ('machine-lateral-raise', 'de'::public.language_code, 'Seitheben an der Maschine'),
    ('overhead-press', 'en'::public.language_code, 'Barbell Overhead Press'),
    ('overhead-press', 'de'::public.language_code, 'Langhantel-Schulterdruecken'),
    ('pallof-press', 'en'::public.language_code, 'Pallof Press'),
    ('pallof-press', 'de'::public.language_code, 'Pallof Press'),
    ('pull-up', 'en'::public.language_code, 'Pull-Up'),
    ('pull-up', 'de'::public.language_code, 'Klimmzug'),
    ('push-up', 'en'::public.language_code, 'Push-Up'),
    ('push-up', 'de'::public.language_code, 'Liegestuetz'),
    ('seated-calf-raise', 'en'::public.language_code, 'Seated Calf Raise'),
    ('seated-calf-raise', 'de'::public.language_code, 'Sitzendes Wadenheben'),
    ('sumo-deadlift', 'en'::public.language_code, 'Sumo Deadlift'),
    ('sumo-deadlift', 'de'::public.language_code, 'Sumo-Kreuzheben'),
    ('trap-bar-deadlift', 'en'::public.language_code, 'Trap Bar Deadlift'),
    ('trap-bar-deadlift', 'de'::public.language_code, 'Trap-Bar-Kreuzheben')
)
insert into public.exercise_translations (exercise_id, lang_code, name)
select e.id, ts.lang_code, ts.name
from translation_seed ts
join public.exercises e
  on e.slug = ts.slug
on conflict (exercise_id, lang_code) do update
set name = excluded.name;

-- Barbell base-weight defaults for new barbell compounds (existing users).
with barbell_exercise_slugs(slug) as (
  values
    ('barbell-incline-press'),
    ('barbell-romanian-deadlift'),
    ('front-squat'),
    ('sumo-deadlift'),
    ('trap-bar-deadlift')
)
insert into public.user_exercise_defaults (
  user_id,
  exercise_id,
  default_base_weight_kg,
  suggest_warmups
)
select
  u.id,
  e.id,
  20,
  true
from public.app_users u
join public.exercises e
  on e.slug in (select slug from barbell_exercise_slugs)
on conflict (user_id, exercise_id) do update
set
  default_base_weight_kg = excluded.default_base_weight_kg,
  updated_at = now();
