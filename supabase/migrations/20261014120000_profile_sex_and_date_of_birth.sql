do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'profile_sex'
      and typnamespace = 'public'::regnamespace
  ) then
    create type public.profile_sex as enum ('female', 'male');
  end if;
end
$$;

alter table public.user_profile_metrics
  add column if not exists sex public.profile_sex,
  add column if not exists date_of_birth date;

alter table public.user_profile_metrics
  drop constraint if exists user_profile_metrics_date_of_birth_chk;

alter table public.user_profile_metrics
  add constraint user_profile_metrics_date_of_birth_chk
  check (
    date_of_birth is null
    or (
      date_of_birth >= date '1900-01-01'
      and date_of_birth <= current_date
    )
  );

comment on column public.user_profile_metrics.sex is
  'Optional. With date of birth and bodyweight, used to compare main lifts with published standards.';

comment on column public.user_profile_metrics.date_of_birth is
  'Optional. When set, the app also stores that year in birth_year.';
