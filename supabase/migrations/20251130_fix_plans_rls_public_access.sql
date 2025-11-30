-- Fix RLS policy for plans table to allow public access
-- Date: 2025-11-30
-- Purpose: Allow unauthenticated users to view pricing plans

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;

-- Create a new policy that allows everyone (including anonymous users) to view plans
CREATE POLICY "Anyone can view plans" 
ON public.plans 
FOR SELECT 
USING (true);

-- Also ensure plan_restrictions are publicly readable
DROP POLICY IF EXISTS "Authenticated users can view plan restrictions" ON public.plan_restrictions;

CREATE POLICY "Anyone can view plan restrictions" 
ON public.plan_restrictions 
FOR SELECT 
USING (true);

-- Enable RLS on plan_restrictions if not already enabled
ALTER TABLE public.plan_restrictions ENABLE ROW LEVEL SECURITY;

-- Verify the changes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('plans', 'plan_restrictions')
ORDER BY tablename, policyname;
