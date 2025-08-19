-- Create profiles for existing users who don't have them yet
INSERT INTO public.profiles (user_id, display_name)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'display_name', au.email) as display_name
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id  
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;