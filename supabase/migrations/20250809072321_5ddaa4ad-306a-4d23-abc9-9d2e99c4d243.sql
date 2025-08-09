-- Fix infinite recursion in RLS between teams and team_members by using SECURITY DEFINER helper functions

-- 1) Helper functions
create or replace function public.is_team_member(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = _team_id and user_id = _user_id
  );
$$;

create or replace function public.is_team_owner(_team_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.teams
    where id = _team_id and owner_id = _user_id
  );
$$;

-- 2) Recreate team_members policies without referencing teams directly
drop policy if exists "Members can view their memberships" on public.team_members;
drop policy if exists "Owners can add members" on public.team_members;
drop policy if exists "Owners can manage memberships" on public.team_members;
drop policy if exists "Owners can remove memberships" on public.team_members;

create policy "Members can view their memberships"
  on public.team_members
  for select
  using (
    user_id = auth.uid() OR public.is_team_owner(team_members.team_id, auth.uid())
  );

create policy "Owners can add members"
  on public.team_members
  for insert
  with check (
    public.is_team_owner(team_members.team_id, auth.uid())
  );

create policy "Owners can manage memberships"
  on public.team_members
  for update
  using (
    public.is_team_owner(team_members.team_id, auth.uid())
  )
  with check (
    public.is_team_owner(team_members.team_id, auth.uid())
  );

create policy "Owners can remove memberships"
  on public.team_members
  for delete
  using (
    public.is_team_owner(team_members.team_id, auth.uid())
  );

-- 3) Recreate teams visibility policy without referencing team_members directly
DROP POLICY IF EXISTS "Teams visible to members" ON public.teams;

create policy "Teams visible to members"
  on public.teams
  for select
  using (
    owner_id = auth.uid() OR public.is_team_member(id, auth.uid())
  );