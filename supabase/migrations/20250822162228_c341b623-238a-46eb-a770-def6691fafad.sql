-- Fix security issue: Add search_path to log_team_activity function
CREATE OR REPLACE FUNCTION public.log_team_activity(
  p_action TEXT,
  p_team_id UUID,
  p_admin_user_id UUID,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.admin_logs (action, admin_user_id, target_type, target_id, details)
  VALUES (p_action, p_admin_user_id, p_target_type, p_target_id, 
    COALESCE(p_details, '{}') || jsonb_build_object('team_id', p_team_id))
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;