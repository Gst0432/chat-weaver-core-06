-- Enable pgvector extension
create extension if not exists vector;

-- Create embeddings table
create table if not exists public.embeddings (
  id bigserial primary key,
  conversation_id uuid not null,
  message_id uuid,
  user_id uuid not null,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.embeddings enable row level security;

-- Policies: mirror messages access (owner or team member)
create policy if not exists "Read embeddings (members)"
  on public.embeddings
  for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          c.user_id = auth.uid()
          or (
            c.team_id is not null and exists (
              select 1 from public.team_members tm
              where tm.team_id = c.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

create policy if not exists "Insert embeddings (owner or team member)"
  on public.embeddings
  for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (
          c.user_id = auth.uid()
          or (
            c.team_id is not null and exists (
              select 1 from public.team_members tm
              where tm.team_id = c.team_id and tm.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Optional: prevent updates/deletes by default (no permissive policies)

-- RPC function for similarity search within a conversation
create or replace function public.match_embeddings(
  query_embedding vector(1536),
  conv_id uuid,
  match_count int default 5
) returns table(
  id bigint,
  message_id uuid,
  content text,
  distance float4
) language sql stable as $$
  select e.id, e.message_id, e.content,
         1 - (e.embedding <#> query_embedding) as distance
  from public.embeddings e
  where e.conversation_id = conv_id
  order by e.embedding <#> query_embedding
  limit greatest(match_count, 1)
$$;