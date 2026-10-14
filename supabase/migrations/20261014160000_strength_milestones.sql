-- User-owned strength milestones. Progress rules write the achieved columns later.
-- Bodyweight stays on user_profile_metrics; this table does not keep a bodyweight history.

create type public.strength_milestone_type as enum (
  'absolute',
  'bodyweight_multiple'
);

create table public.strength_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  exercise_id uuid not null,
  milestone_type public.strength_milestone_type not null,
  target_weight_kg numeric(6,2),
  bodyweight_multiple numeric(4,2),
  min_reps integer not null default 1,
  due_on date,
  note text,
  achieved_at timestamp with time zone,
  achieved_bodyweight_kg numeric(6,2),
  achieved_threshold_kg numeric(6,2),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint strength_milestones_min_reps_chk
    check (min_reps >= 1),
  constraint strength_milestones_note_chk
    check (note is null or length(trim(note)) > 0),
  constraint strength_milestones_target_chk
    check (
      (
        milestone_type = 'absolute'
        and target_weight_kg > 0
        and bodyweight_multiple is null
      )
      or (
        milestone_type = 'bodyweight_multiple'
        and bodyweight_multiple > 0
        and target_weight_kg is null
      )
    ),
  constraint strength_milestones_achieved_bodyweight_chk
    check (
      achieved_bodyweight_kg is null
      or (
        achieved_bodyweight_kg >= 20
        and achieved_bodyweight_kg <= 400
      )
    ),
  constraint strength_milestones_achieved_chk
    check (
      (
        achieved_at is null
        and achieved_bodyweight_kg is null
        and achieved_threshold_kg is null
      )
      or (
        achieved_at is not null
        and achieved_threshold_kg > 0
        and (
          (
            milestone_type = 'absolute'
            and achieved_bodyweight_kg is null
          )
          or (
            milestone_type = 'bodyweight_multiple'
            and achieved_bodyweight_kg is not null
          )
        )
      )
    ),
  constraint strength_milestones_user_id_fkey
    foreign key (user_id) references public.app_users (id) on delete cascade,
  constraint strength_milestones_exercise_id_fkey
    foreign key (exercise_id) references public.exercises (id) on delete restrict
);

create index idx_strength_milestones_user_exercise
  on public.strength_milestones using btree (user_id, exercise_id);

create trigger trg_strength_milestones_set_updated_at
before update on public.strength_milestones
for each row execute function public.set_updated_at();

alter table public.strength_milestones enable row level security;

create policy strength_milestones_owner_all
on public.strength_milestones
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant all on table public.strength_milestones to anon;
grant all on table public.strength_milestones to authenticated;
grant all on table public.strength_milestones to service_role;

comment on table public.strength_milestones is
  'One strength goal per row, owned by the signed-in user. Achieved columns stay empty until progress rules write them.';

comment on column public.strength_milestones.milestone_type is
  'absolute stores target_weight_kg. bodyweight_multiple stores a multiple of Account bodyweight.';

comment on column public.strength_milestones.target_weight_kg is
  'Absolute Total (kg) target. Required for absolute milestones and empty otherwise.';

comment on column public.strength_milestones.bodyweight_multiple is
  'Multiple of Account bodyweight, such as 1.0. Required for bodyweight_multiple milestones and empty otherwise.';

comment on column public.strength_milestones.min_reps is
  'A set counts only when its reps are at least this value. Defaults to 1.';

comment on column public.strength_milestones.due_on is
  'Optional. A past date does not fail the milestone.';

comment on column public.strength_milestones.achieved_at is
  'When a qualifying set first met the threshold. Empty while the milestone is active.';

comment on column public.strength_milestones.achieved_bodyweight_kg is
  'Account bodyweight captured when a bodyweight_multiple milestone was achieved.';

comment on column public.strength_milestones.achieved_threshold_kg is
  'Kilogram threshold captured at achievement. Later bodyweight changes do not rewrite it.';
