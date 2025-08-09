-- Fix function search_path for security best practices
create or replace function public.match_embeddings(
  query_embedding vector(1536),
  conv_id uuid,
  match_count int default 5
) returns table(
  id bigint,
  message_id uuid,
  content text,
  distance float4
) language sql stable
set search_path = public
as $$
  select e.id, e.message_id, e.content,
         1 - (e.embedding <#> query_embedding) as distance
  from public.embeddings e
  where e.conversation_id = conv_id
  order by e.embedding <#> query_embedding
  limit greatest(match_count, 1)
$$;