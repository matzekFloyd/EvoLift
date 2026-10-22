alter table public.app_users
  add column if not exists double_progression boolean not null default false;

comment on column public.app_users.double_progression is
  'When true, target suggestions use double progression for the next session. Default off.';
