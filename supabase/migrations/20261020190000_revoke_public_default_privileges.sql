-- New public objects no longer inherit Data API grants.
-- Grants already applied to existing tables, views, and functions stay.
-- The next migration must grant each new table, view, and Data API or trigger function.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;

-- Created while default privileges were on, then revoked from PUBLIC with no
-- explicit EXECUTE grant. Writers of workout_plans need it or the trigger fails.
grant execute on function public.enforce_single_active_workout_plan() to authenticated;
grant execute on function public.enforce_single_active_workout_plan() to service_role;
