-- Create get-pexels-key edge function entry if needed for Pexels API
-- This is just a placeholder migration to ensure the function can be called
-- The actual function will be created separately

-- Add any additional columns or tables needed for app generation tracking
CREATE TABLE IF NOT EXISTS public.generated_apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  app_name TEXT NOT NULL,
  app_type TEXT NOT NULL,
  industry TEXT NOT NULL,
  generated_content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on generated_apps table
ALTER TABLE public.generated_apps ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own generated apps
CREATE POLICY "Users can view their own generated apps"
ON public.generated_apps
FOR SELECT
USING (auth.uid() = user_id);

-- Create policy for users to insert their own generated apps
CREATE POLICY "Users can create their own generated apps"
ON public.generated_apps
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own generated apps
CREATE POLICY "Users can update their own generated apps"
ON public.generated_apps
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own generated apps
CREATE POLICY "Users can delete their own generated apps"
ON public.generated_apps
FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generated_apps_updated_at
  BEFORE UPDATE ON public.generated_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();