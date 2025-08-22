-- Create audio recordings table
CREATE TABLE public.audio_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 0, -- in seconds
  file_size INTEGER NOT NULL DEFAULT 0, -- in bytes
  mime_type TEXT NOT NULL DEFAULT 'audio/webm',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transcriptions table
CREATE TABLE public.transcriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID NOT NULL REFERENCES public.audio_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'fr',
  confidence FLOAT DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create translation sessions table
CREATE TABLE public.translation_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transcription_id UUID NOT NULL REFERENCES public.transcriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_language TEXT NOT NULL,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  voiceover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.audio_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translation_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for audio_recordings
CREATE POLICY "Users can view their own recordings" 
ON public.audio_recordings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings" 
ON public.audio_recordings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" 
ON public.audio_recordings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" 
ON public.audio_recordings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for transcriptions
CREATE POLICY "Users can view their own transcriptions" 
ON public.transcriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcriptions" 
ON public.transcriptions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transcriptions" 
ON public.transcriptions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcriptions" 
ON public.transcriptions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for translation_sessions
CREATE POLICY "Users can view their own translation sessions" 
ON public.translation_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own translation sessions" 
ON public.translation_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own translation sessions" 
ON public.translation_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own translation sessions" 
ON public.translation_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_audio_recordings_updated_at
BEFORE UPDATE ON public.audio_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-recordings', 'audio-recordings', false);

-- Create storage policies for audio recordings
CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);