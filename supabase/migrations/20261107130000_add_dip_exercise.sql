-- Bodyweight dip on the bars. Loaded (kg) is added weight. Blank or 0 is bodyweight.
-- Base weight stays empty. Bodyweight is not a base weight.

insert into public.exercises (slug, primary_muscle_area, secondary_muscle_area)
values ('dip', 'chest', 'triceps')
on conflict (slug) do update
set
  primary_muscle_area = excluded.primary_muscle_area,
  secondary_muscle_area = excluded.secondary_muscle_area;

with translation_seed(slug, lang_code, name) as (
  values
    ('dip', 'en'::public.language_code, 'Dip'),
    ('dip', 'de'::public.language_code, 'Dip')
)
insert into public.exercise_translations (exercise_id, lang_code, name)
select e.id, ts.lang_code, ts.name
from translation_seed ts
join public.exercises e
  on e.slug = ts.slug
on conflict (exercise_id, lang_code) do update
set name = excluded.name;
