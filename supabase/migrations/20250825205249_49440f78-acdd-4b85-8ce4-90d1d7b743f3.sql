-- Create table to track ebook generation status
CREATE TABLE public.ebook_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating_toc', 'generating_chapters', 'assembling', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  current_chapter INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  generated_chapters INTEGER DEFAULT 0,
  error_message TEXT,
  ebook_id UUID REFERENCES public.ebooks(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ebook_generations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ebook generations" 
ON public.ebook_generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ebook generations" 
ON public.ebook_generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ebook generations" 
ON public.ebook_generations 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for timestamps
CREATE TRIGGER update_ebook_generations_updated_at
BEFORE UPDATE ON public.ebook_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_ebook_generations_user_status ON public.ebook_generations(user_id, status);
CREATE INDEX idx_ebook_generations_created_at ON public.ebook_generations(created_at DESC);