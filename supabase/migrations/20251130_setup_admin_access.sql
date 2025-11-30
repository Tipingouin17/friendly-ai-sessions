-- Setup admin access for testing
-- This migration adds the role column to profiles and creates necessary views

-- 1. Add role column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'role'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT NULL;
    END IF;
END $$;

-- 2. Add banned column if it doesn't exist (for user management)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'banned'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN banned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 3. Grant admin access to test user
-- This uses a subquery to find the user ID from auth.users by email
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = (
    SELECT id FROM auth.users 
    WHERE email = 'john.doe1764521269@gmail.com'
    LIMIT 1
);

-- 4. Create admin_profiles_view for UserManagement component
-- This view allows admins to see user emails (which are in auth.users)
DROP VIEW IF EXISTS public.admin_profiles_view;

CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT 
    p.id,
    au.email,
    p.role,
    p.current_plan_id as plan_id,
    p.created_at,
    p.updated_at,
    COALESCE(p.banned, false) as banned
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- 5. Grant access to the view
GRANT SELECT ON public.admin_profiles_view TO authenticated;

-- 6. Add RLS policy for admins to manage users
-- Admins should be able to update other users' profiles
CREATE POLICY "Admins can update user profiles" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 7. Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
    OR id = auth.uid() -- Users can view their own profile
);

COMMENT ON COLUMN public.profiles.role IS 'User role: admin for platform administrators, null for regular users';
COMMENT ON COLUMN public.profiles.banned IS 'Whether the user is banned from the platform';
COMMENT ON VIEW public.admin_profiles_view IS 'Admin view combining profiles with auth.users emails for user management';
