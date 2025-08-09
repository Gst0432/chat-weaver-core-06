-- Enable required extensions
create extension if not exists pgcrypto;

-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text default 'Mon équipe',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Team members table
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

-- Conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete set null,
  user_id uuid not null,
  title text,
  created_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  model text,
  created_at timestamptz not null default now()
);

-- Update updated_at helper
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for teams.updated_at
create or replace trigger trg_teams_updated_at
before update on public.teams
for each row execute function public.update_updated_at_column();

-- Auto-add owner as team member
create or replace function public.add_owner_to_team()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_add_owner_to_team
after insert on public.teams
for each row execute function public.add_owner_to_team();

-- Enforce max 3 members per team
create or replace function public.enforce_team_member_limit()
returns trigger as $$
declare
  member_count int;
begin
  select count(*) into member_count from public.team_members where team_id = new.team_id;
  if member_count >= 3 then
    raise exception 'Team member limit reached (max 3) for team %', new.team_id;
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_enforce_team_member_limit
before insert on public.team_members
for each row execute function public.enforce_team_member_limit();

-- Enable RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Policies
-- Teams: owners can manage/select; members can select
create policy "Teams visible to members"
  on public.teams
  for select
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.team_members tm where tm.team_id = id and tm.user_id = auth.uid()
    )
  );

create policy "Team owners can insert"
  on public.teams
  for insert
  with check (owner_id = auth.uid());

create policy "Team owners can update"
  on public.teams
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Team owners can delete"
  on public.teams
  for delete
  using (owner_id = auth.uid());

-- Team members policies
create policy "Members can view their memberships"
  on public.team_members
  for select
  using (user_id = auth.uid() or exists (
    select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()
  ));

create policy "Owners can add members"
  on public.team_members
  for insert
  with check (exists (
    select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()
  ));

create policy "Owners can manage memberships"
  on public.team_members
  for update
  using (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()));

create policy "Owners can remove memberships"
  on public.team_members
  for delete
  using (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()));

-- Conversations: visible to owner and team members; only last 30 days
create policy "Read conversations (30 days)"
  on public.conversations
  for select
  using (
    created_at >= now() - interval '30 days' and (
      user_id = auth.uid() or (
        team_id is not null and exists (
          select 1 from public.team_members tm where tm.team_id = conversations.team_id and tm.user_id = auth.uid()
        )
      )
    )
  );

create policy "Insert conversations (owner or team member)"
  on public.conversations
  for insert
  with check (
    user_id = auth.uid() and (
      team_id is null or exists (
        select 1 from public.team_members tm where tm.team_id = team_id and tm.user_id = auth.uid()
      )
    )
  );

create policy "Update own conversations"
  on public.conversations
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Delete own conversations"
  on public.conversations
  for delete
  using (user_id = auth.uid());

-- Messages: visible via conversation access; only last 30 days
create policy "Read messages (30 days)"
  on public.messages
  for select
  using (
    created_at >= now() - interval '30 days' and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (
        c.user_id = auth.uid() or (
          c.team_id is not null and exists (
            select 1 from public.team_members tm where tm.team_id = c.team_id and tm.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Insert messages (owner or team member)"
  on public.messages
  for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (
        c.user_id = auth.uid() or (
          c.team_id is not null and exists (
            select 1 from public.team_members tm where tm.team_id = c.team_id and tm.user_id = auth.uid()
          )
        )
      )
    )
  );

create policy "Update own messages not needed" on public.messages for update to authenticated using (false) with check (false);
create policy "Delete own messages not needed" on public.messages for delete to authenticated using (false);
