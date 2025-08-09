-- Create chat sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_created_at ON public.chat_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at ON public.chat_messages(session_id, created_at ASC);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policies for chat_sessions
CREATE POLICY IF NOT EXISTS "Users can view their own chat sessions"
ON public.chat_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own chat sessions"
ON public.chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own chat sessions"
ON public.chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own chat sessions"
ON public.chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Policies for chat_messages
CREATE POLICY IF NOT EXISTS "Users can view messages of their sessions"
ON public.chat_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions s
  WHERE s.id = session_id AND s.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can insert messages into their sessions"
ON public.chat_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.chat_sessions s
  WHERE s.id = session_id AND s.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can update messages of their sessions"
ON public.chat_messages FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions s
  WHERE s.id = session_id AND s.user_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Users can delete messages of their sessions"
ON public.chat_messages FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.chat_sessions s
  WHERE s.id = session_id AND s.user_id = auth.uid()
));

-- Trigger to update updated_at on chat_sessions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trg_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function to enforce 30-day retention per user
CREATE OR REPLACE FUNCTION public.cleanup_old_chats()
RETURNS TRIGGER AS $$
DECLARE
  v_user UUID;
BEGIN
  -- Determine the owner of the affected session (for messages) or the new session itself
  IF TG_TABLE_NAME = 'chat_messages' THEN
    SELECT s.user_id INTO v_user FROM public.chat_sessions s WHERE s.id = NEW.session_id;
  ELSIF TG_TABLE_NAME = 'chat_sessions' THEN
    v_user := NEW.user_id;
  END IF;

  -- Delete old messages (> 30 days) for this user
  DELETE FROM public.chat_messages m
  USING public.chat_sessions s
  WHERE m.session_id = s.id
    AND s.user_id = v_user
    AND m.created_at < now() - interval '30 days';

  -- Delete old sessions (> 30 days) for this user (messages will cascade)
  DELETE FROM public.chat_sessions cs
  WHERE cs.user_id = v_user
    AND cs.created_at < now() - interval '30 days';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers to run cleanup after inserts
DROP TRIGGER IF EXISTS trg_cleanup_on_message_insert ON public.chat_messages;
CREATE TRIGGER trg_cleanup_on_message_insert
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_chats();

DROP TRIGGER IF EXISTS trg_cleanup_on_session_insert ON public.chat_sessions;
CREATE TRIGGER trg_cleanup_on_session_insert
AFTER INSERT ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_chats();
