-- Add missing column to existing generated_apps table
ALTER TABLE public.generated_apps ADD COLUMN IF NOT EXISTS generation_options JSONB DEFAULT '{}'::jsonb;

-- Create missing tables for SaaS generator enhancements

-- Table for user preferences and contextual memory
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  favorite_industries TEXT[],
  favorite_styles TEXT[],
  favorite_colors TEXT[],
  default_technical_features JSONB,
  generation_history JSONB DEFAULT '[]'::jsonb,
  template_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user preferences
CREATE POLICY "Users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for user preferences timestamps
CREATE TRIGGER update_user_preferences_updated_at
BEFORE UPDATE ON public.user_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Table for SaaS templates and reusable components
CREATE TABLE IF NOT EXISTS public.saas_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  industry TEXT NOT NULL,
  template_content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saas_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for templates
CREATE POLICY "Users can view their own templates" 
ON public.saas_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" 
ON public.saas_templates 
FOR SELECT 
USING (is_public = true);

CREATE POLICY "Users can create their own templates" 
ON public.saas_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" 
ON public.saas_templates 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" 
ON public.saas_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for templates timestamps
CREATE TRIGGER update_saas_templates_updated_at
BEFORE UPDATE ON public.saas_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_templates_user_id ON public.saas_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_templates_public ON public.saas_templates(is_public) WHERE is_public = true;