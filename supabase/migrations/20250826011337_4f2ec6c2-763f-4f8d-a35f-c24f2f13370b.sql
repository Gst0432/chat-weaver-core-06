-- Create video_history table for storing generated videos
CREATE TABLE public.video_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  model TEXT NOT NULL,
  duration REAL NOT NULL,
  cfg_scale REAL NOT NULL,
  aspect_ratio TEXT NOT NULL,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own video history" 
ON public.video_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video history" 
ON public.video_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video history" 
ON public.video_history 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video history" 
ON public.video_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_history_updated_at
BEFORE UPDATE ON public.video_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();