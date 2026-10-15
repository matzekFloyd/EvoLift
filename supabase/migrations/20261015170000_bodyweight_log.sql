-- Dated bodyweight entries. The latest row is the current account bodyweight.
-- Open goals and Lift comparison read the latest row on or before a session date.

create table public.user_bodyweight_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  bodyweight_kg numeric(6,2) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint user_bodyweight_log_user_date_key unique (user_id, logged_on),
  constraint user_bodyweight_log_bodyweight_kg_chk
    check (bodyweight_kg >= 20 and bodyweight_kg <= 400),
  constraint user_bodyweight_log_user_id_fkey
    foreign key (user_id) references public.app_users (id) on delete cascade
);

create index idx_user_bodyweight_log_user_date
  on public.user_bodyweight_log using btree (user_id, logged_on);

create trigger trg_user_bodyweight_log_set_updated_at
before update on public.user_bodyweight_log
for each row execute function public.set_updated_at();

alter table public.user_bodyweight_log enable row level security;

create policy user_bodyweight_log_owner_all
on public.user_bodyweight_log
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant all on table public.user_bodyweight_log to anon;
grant all on table public.user_bodyweight_log to authenticated;
grant all on table public.user_bodyweight_log to service_role;

comment on table public.user_bodyweight_log is
  'One bodyweight per user per date. The latest date is the current bodyweight.';

comment on column public.user_bodyweight_log.logged_on is
  'The date this bodyweight applies from, until the next entry.';

insert into public.user_bodyweight_log (user_id, logged_on, bodyweight_kg)
select user_id, current_date, bodyweight_kg
from public.user_profile_metrics
where bodyweight_kg is not null
on conflict (user_id, logged_on) do update
set bodyweight_kg = excluded.bodyweight_kg,
    updated_at = now();
