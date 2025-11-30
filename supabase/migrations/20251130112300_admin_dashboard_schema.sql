-- Add banned column to profiles for user management
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT FALSE;

-- Add description to plans for better display
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add missing feature flags to plan_restrictions
ALTER TABLE public.plan_restrictions
ADD COLUMN IF NOT EXISTS custom_branding BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority_support BOOLEAN DEFAULT FALSE;

-- Create a view to easily query profiles with emails (joining auth.users)
-- This avoids adding an email column to profiles which duplicates data
CREATE OR REPLACE VIEW public.admin_profiles_view AS
SELECT 
  p.id,
  p.role,
  p.current_plan_id,
  p.created_at,
  p.updated_at,
  p.banned,
  p.subscription_status,
  p.stripe_customer_id,
  p.stripe_subscription_id,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id;

-- Grant access to the view for admins
GRANT SELECT ON public.admin_profiles_view TO authenticated;
