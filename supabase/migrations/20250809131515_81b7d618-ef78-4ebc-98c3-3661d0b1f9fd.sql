-- Assigner le rôle super_admin à l'utilisateur spécifique
-- Remplacez l'email par votre email d'utilisateur connecté
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role
FROM auth.users 
WHERE email = '227makemoney@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;