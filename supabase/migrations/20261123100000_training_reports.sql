-- Saved AI training reports. One row is a snapshot of one generation.
-- The lifter's account does not store a credit balance.

create table public.training_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  period_start date not null,
  period_end date not null,
  model text not null,
  report_text text not null,
  created_at timestamp with time zone not null default now(),
  constraint training_reports_period_chk check (period_end >= period_start),
  constraint training_reports_text_len_chk check (char_length(report_text) between 1 and 12000),
  constraint training_reports_model_len_chk check (char_length(model) between 1 and 120),
  constraint training_reports_user_id_fkey
    foreign key (user_id) references public.app_users (id) on delete cascade
);

create index idx_training_reports_user_created
  on public.training_reports using btree (user_id, created_at desc);

alter table public.training_reports enable row level security;

create policy training_reports_owner_all
on public.training_reports
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant all on table public.training_reports to anon;
grant all on table public.training_reports to authenticated;
grant all on table public.training_reports to service_role;

comment on table public.training_reports is
  'A saved report of logged training. Later edits to sessions do not change the text.';
