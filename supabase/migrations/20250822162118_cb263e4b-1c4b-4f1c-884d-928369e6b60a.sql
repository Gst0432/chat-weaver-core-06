-- Create team invitations table for pending invitations
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  UNIQUE(team_id, email)
);

-- Enable RLS on team invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Team owners can manage invitations for their teams
CREATE POLICY "Team owners can manage invitations"
ON public.team_invitations
FOR ALL
USING (is_team_owner(team_id, auth.uid()));

-- Users can view invitations sent to their email
CREATE POLICY "Users can view their own invitations"
ON public.team_invitations
FOR SELECT
USING (email = auth.email());

-- Add trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add team activity logging function
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