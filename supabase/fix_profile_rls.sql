-- FIX: Remove infinite recursion in RLS policies

-- Drop ALL existing SELECT policies on profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;

-- Create ONE simple policy: users can read their own profile
-- This allows the admin check to work without recursion
CREATE POLICY "Users can read own profile" 
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- That's it! No admin check in the policy - let the app code handle that.
-- The ProtectedAdminRoute will be able to read the user's own profile (including role field)
-- and check if role = 'admin' in the application code.

-- Verify the policy
SELECT policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
