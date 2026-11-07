-- Clarify barbell equipment on Close-Grip Bench Press and Sumo Deadlift (slugs unchanged).

with translation_seed(slug, lang_code, name) as (
  values
    ('close-grip-bench-press', 'en'::public.language_code, 'Barbell Close-Grip Bench Press'),
    ('close-grip-bench-press', 'de'::public.language_code, 'Enges Langhantel-Bankdruecken'),
    ('sumo-deadlift', 'en'::public.language_code, 'Barbell Sumo Deadlift'),
    ('sumo-deadlift', 'de'::public.language_code, 'Sumo-Langhantel-Kreuzheben')
)
insert into public.exercise_translations (exercise_id, lang_code, name)
select e.id, ts.lang_code, ts.name
from translation_seed ts
join public.exercises e
  on e.slug = ts.slug
on conflict (exercise_id, lang_code) do update
set name = excluded.name;
