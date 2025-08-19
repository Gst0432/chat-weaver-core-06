-- Add free quota tracking to subscribers table
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS free_generations_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_generations_limit INTEGER DEFAULT 5;

-- Create function to check and update free generation quota
CREATE OR REPLACE FUNCTION public.check_free_generation_quota(user_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  subscriber_record public.subscribers%ROWTYPE;
  can_generate boolean := false;
  quota_info jsonb;
BEGIN
  -- Get or create subscriber record
  SELECT * INTO subscriber_record 
  FROM public.subscribers 
  WHERE email = user_email;
  
  -- If subscriber doesn't exist, create one
  IF NOT FOUND THEN
    INSERT INTO public.subscribers (email, free_generations_used, free_generations_limit, subscribed)
    VALUES (user_email, 0, 5, false)
    RETURNING * INTO subscriber_record;
  END IF;
  
  -- Check if user can generate
  IF subscriber_record.subscribed = true THEN
    can_generate := true;
  ELSIF subscriber_record.free_generations_used < subscriber_record.free_generations_limit THEN
    can_generate := true;
  END IF;
  
  -- Return quota information
  quota_info := jsonb_build_object(
    'can_generate', can_generate,
    'is_subscribed', subscriber_record.subscribed,
    'free_used', subscriber_record.free_generations_used,
    'free_limit', subscriber_record.free_generations_limit,
    'remaining_free', GREATEST(0, subscriber_record.free_generations_limit - subscriber_record.free_generations_used)
  );
  
  RETURN quota_info;
END;
$$;

-- Create function to increment free generation usage
CREATE OR REPLACE FUNCTION public.increment_free_generation(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = 'public'
AS $$
DECLARE
  updated_rows integer;
BEGIN
  -- Increment free generations used for non-subscribed users
  UPDATE public.subscribers 
  SET free_generations_used = free_generations_used + 1
  WHERE email = user_email 
    AND subscribed = false 
    AND free_generations_used < free_generations_limit;
    
  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  
  RETURN updated_rows > 0;
END;
$$;