-- Create TTS history table for storing user's text-to-speech generations
CREATE TABLE public.tts_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  voice TEXT NOT NULL DEFAULT 'alloy',
  speed REAL NOT NULL DEFAULT 1.0,
  format TEXT NOT NULL DEFAULT 'mp3',
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tts_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own TTS history" 
ON public.tts_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own TTS history" 
ON public.tts_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TTS history" 
ON public.tts_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TTS history" 
ON public.tts_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_tts_history_updated_at
BEFORE UPDATE ON public.tts_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();