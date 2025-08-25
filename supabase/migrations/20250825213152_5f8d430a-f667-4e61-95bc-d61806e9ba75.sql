-- Create table for storing individual ebook chapters (checkpoints)
CREATE TABLE public.ebook_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generation_id UUID NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  chapter_content TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  chapter_type TEXT NOT NULL DEFAULT 'chapter', -- 'foreword', 'intro', 'chapter', 'conclusion'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  FOREIGN KEY (generation_id) REFERENCES public.ebook_generations(id) ON DELETE CASCADE,
  UNIQUE(generation_id, chapter_number)
);

-- Enable RLS on ebook_chapters
ALTER TABLE public.ebook_chapters ENABLE ROW LEVEL SECURITY;

-- Create policies for ebook_chapters
CREATE POLICY "Users can view their own ebook chapters" 
ON public.ebook_chapters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.ebook_generations 
    WHERE id = generation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own ebook chapters" 
ON public.ebook_chapters 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ebook_generations 
    WHERE id = generation_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own ebook chapters" 
ON public.ebook_chapters 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.ebook_generations 
    WHERE id = generation_id AND user_id = auth.uid()
  )
);

-- Add generation queue management columns to user_preferences
ALTER TABLE public.user_preferences 
ADD COLUMN IF NOT EXISTS active_ebook_generations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_concurrent_generations INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS last_generation_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_generations_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS daily_generation_limit INTEGER DEFAULT 10;

-- Create index for better performance
CREATE INDEX idx_ebook_chapters_generation_id ON public.ebook_chapters(generation_id);
CREATE INDEX idx_ebook_chapters_chapter_number ON public.ebook_chapters(generation_id, chapter_number);

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ebook_chapters;
ALTER TABLE public.ebook_chapters REPLICA IDENTITY FULL;

-- Function to manage generation limits
CREATE OR REPLACE FUNCTION public.check_generation_limits(user_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_prefs RECORD;
  active_count INTEGER;
  today_count INTEGER;
  can_start BOOLEAN := false;
  reason TEXT := '';
BEGIN
  -- Get user preferences
  SELECT * INTO user_prefs 
  FROM public.user_preferences 
  WHERE user_id = user_id_param;
  
  -- Create preferences if they don't exist
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (
      user_id, 
      active_ebook_generations, 
      max_concurrent_generations,
      total_generations_today,
      daily_generation_limit
    )
    VALUES (user_id_param, 0, 2, 0, 10)
    RETURNING * INTO user_prefs;
  END IF;
  
  -- Count active generations
  SELECT COUNT(*) INTO active_count
  FROM public.ebook_generations
  WHERE user_id = user_id_param 
    AND status IN ('pending', 'generating_toc', 'generating_chapters', 'assembling');
  
  -- Count today's generations
  SELECT COUNT(*) INTO today_count
  FROM public.ebook_generations
  WHERE user_id = user_id_param 
    AND created_at >= CURRENT_DATE;
  
  -- Check limits
  IF active_count >= COALESCE(user_prefs.max_concurrent_generations, 2) THEN
    reason := 'Maximum concurrent generations reached';
  ELSIF today_count >= COALESCE(user_prefs.daily_generation_limit, 10) THEN
    reason := 'Daily generation limit reached';
  ELSE
    can_start := true;
  END IF;
  
  -- Update user preferences with current counts
  UPDATE public.user_preferences 
  SET 
    active_ebook_generations = active_count,
    total_generations_today = today_count,
    last_generation_start = CASE WHEN can_start THEN now() ELSE last_generation_start END
  WHERE user_id = user_id_param;
  
  RETURN jsonb_build_object(
    'can_start', can_start,
    'reason', reason,
    'active_count', active_count,
    'max_concurrent', COALESCE(user_prefs.max_concurrent_generations, 2),
    'today_count', today_count,
    'daily_limit', COALESCE(user_prefs.daily_generation_limit, 10)
  );
END;
$function$;

-- Function to get partial ebook content
CREATE OR REPLACE FUNCTION public.get_partial_ebook_content(generation_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  generation_record RECORD;
  partial_content TEXT := '';
  chapter_record RECORD;
BEGIN
  -- Get generation info
  SELECT * INTO generation_record
  FROM public.ebook_generations
  WHERE id = generation_id_param
    AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN null;
  END IF;
  
  -- Build partial content
  partial_content := format('# %s

*Par %s*

', generation_record.title, generation_record.author);
  
  -- Add generated chapters in order
  FOR chapter_record IN
    SELECT * FROM public.ebook_chapters
    WHERE generation_id = generation_id_param
    ORDER BY chapter_number
  LOOP
    partial_content := partial_content || chapter_record.chapter_content || E'\n\n';
  END LOOP;
  
  RETURN partial_content;
END;
$function$;