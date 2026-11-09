-- Isolated from the Campaign OS v1 schema.
create table public.y27_planner_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.y27_planner_admins enable row level security;
revoke all on public.y27_planner_admins from anon, authenticated;
grant select on public.y27_planner_admins to authenticated;
create policy planner_own_membership on public.y27_planner_admins for select to authenticated
  using ((select auth.uid()) = user_id);

create table public.y27_planner (
  id integer primary key check (id = 2027),
  projects jsonb not null check (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 300),
  revision integer not null default 0 check (revision >= 0)
);
alter table public.y27_planner enable row level security;
revoke all on public.y27_planner from anon, authenticated;
grant select, update (projects, revision) on public.y27_planner to authenticated;
create policy planner_admin_read on public.y27_planner for select to authenticated
  using (exists (select 1 from public.y27_planner_admins where user_id = (select auth.uid())));
create policy planner_admin_write on public.y27_planner for update to authenticated
  using (exists (select 1 from public.y27_planner_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.y27_planner_admins where user_id = (select auth.uid())));
