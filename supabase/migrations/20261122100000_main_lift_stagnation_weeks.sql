alter table public.app_users
  add column if not exists main_lift_stagnation_weeks integer not null default 6;

alter table public.app_users
  drop constraint if exists app_users_main_lift_stagnation_weeks_range;

alter table public.app_users
  add constraint app_users_main_lift_stagnation_weeks_range
  check (main_lift_stagnation_weeks between 1 and 52);

comment on column public.app_users.main_lift_stagnation_weeks is
  'Weeks without a higher estimated 1RM before Insights notes Squat, Bench, Deadlift, or Press. Default 6.';
