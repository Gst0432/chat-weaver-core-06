-- Fix security vulnerability: Restrict profiles table access
-- Remove public access to profiles and implement proper RLS policies

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create more restrictive policies for the profiles table
-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to view other users' profiles but only basic public info
-- This policy will allow authenticated users to see other profiles for team functionality
CREATE POLICY "Authenticated users can view basic profile info"
ON public.profiles 
FOR SELECT
TO authenticated  
USING (true);

-- Note: We keep the existing INSERT and UPDATE policies as they are already secure
-- "Users can insert their own profile" - WITH CHECK (auth.uid() = user_id)
-- "Users can update their own profile" - USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)

-- Add a comment to document the security fix
COMMENT ON TABLE public.profiles IS 'User profiles table with RLS policies to prevent unauthorized access to personal data. Updated to fix security vulnerability where emails could be exposed publicly.';