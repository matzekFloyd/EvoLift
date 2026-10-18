-- Clarify barbell equipment on Back Squat and Deadlift display names (slugs unchanged).

with translation_seed(slug, lang_code, name) as (
  values
    ('back-squat', 'en'::public.language_code, 'Barbell Back Squat'),
    ('back-squat', 'de'::public.language_code, 'Langhantel-Kniebeuge'),
    ('deadlift', 'en'::public.language_code, 'Barbell Deadlift'),
    ('deadlift', 'de'::public.language_code, 'Langhantel-Kreuzheben')
)
insert into public.exercise_translations (exercise_id, lang_code, name)
select e.id, ts.lang_code, ts.name
from translation_seed ts
join public.exercises e
  on e.slug = ts.slug
on conflict (exercise_id, lang_code) do update
set name = excluded.name;
