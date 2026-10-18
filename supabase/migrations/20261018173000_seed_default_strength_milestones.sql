-- Seed a small bodyweight-multiple goal set when an account is created (EVO-218).
-- Idempotent: skips users who already have any strength_milestones row.

create or replace function public.seed_default_strength_milestones(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (
    select 1
    from public.strength_milestones
    where user_id = p_user_id
  ) then
    return;
  end if;

  insert into public.strength_milestones (
    user_id,
    exercise_id,
    milestone_type,
    bodyweight_multiple,
    min_reps
  )
  select
    p_user_id,
    e.id,
    'bodyweight_multiple'::public.strength_milestone_type,
    seed.bodyweight_multiple,
    seed.min_reps
  from (
    values
      ('back-squat', 1.50::numeric, 1),
      ('barbell-bench-press', 1.00::numeric, 1),
      ('deadlift', 2.00::numeric, 1),
      ('overhead-press', 0.75::numeric, 1)
  ) as seed(slug, bodyweight_multiple, min_reps)
  join public.exercises e
    on e.slug = seed.slug;
end;
$$;

comment on function public.seed_default_strength_milestones(uuid) is
  'Inserts starter bodyweight goals for a user with no goals yet. Safe to call more than once.';

revoke all on function public.seed_default_strength_milestones(uuid) from public;
grant execute on function public.seed_default_strength_milestones(uuid) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.app_users (id)
  values (new.id)
  on conflict (id) do nothing;

  perform public.seed_default_strength_milestones(new.id);

  return new;
end;
$$;

-- Existing accounts with an empty Goals list get the same starter set once.
do $$
declare
  user_row record;
begin
  for user_row in
    select u.id
    from public.app_users u
    where not exists (
      select 1
      from public.strength_milestones m
      where m.user_id = u.id
    )
  loop
    perform public.seed_default_strength_milestones(user_row.id);
  end loop;
end;
$$;
