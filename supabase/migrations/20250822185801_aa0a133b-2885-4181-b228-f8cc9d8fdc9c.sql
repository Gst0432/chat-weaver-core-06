-- Create YouTube videos table
CREATE TABLE public.youtube_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  extraction_status TEXT NOT NULL DEFAULT 'pending',
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube transcriptions table
CREATE TABLE public.youtube_transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.youtube_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_language TEXT NOT NULL DEFAULT 'auto',
  confidence DOUBLE PRECISION DEFAULT 0.0,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create YouTube translations table
CREATE TABLE public.youtube_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID NOT NULL REFERENCES public.youtube_transcriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  target_language TEXT NOT NULL,
  translated_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  voiceover_settings JSONB DEFAULT '{}'::jsonb,
  voiceover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_translations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for youtube_videos
CREATE POLICY "Users can view their own YouTube videos" 
ON public.youtube_videos 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own YouTube videos" 
ON public.youtube_videos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own YouTube videos" 
ON public.youtube_videos 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own YouTube videos" 
ON public.youtube_videos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for youtube_transcriptions
CREATE POLICY "Users can view their own YouTube transcriptions" 
ON public.youtube_transcriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own YouTube transcriptions" 
ON public.youtube_transcriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own YouTube transcriptions" 
ON public.youtube_transcriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own YouTube transcriptions" 
ON public.youtube_transcriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for youtube_translations
CREATE POLICY "Users can view their own YouTube translations" 
ON public.youtube_translations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own YouTube translations" 
ON public.youtube_translations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own YouTube translations" 
ON public.youtube_translations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own YouTube translations" 
ON public.youtube_translations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create update triggers
CREATE TRIGGER update_youtube_videos_updated_at
BEFORE UPDATE ON public.youtube_videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_transcriptions_updated_at
BEFORE UPDATE ON public.youtube_transcriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_translations_updated_at
BEFORE UPDATE ON public.youtube_translations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();