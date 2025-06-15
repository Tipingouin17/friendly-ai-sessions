
-- First, create the is_session_host function
CREATE OR REPLACE FUNCTION public.is_session_host(conversation_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND user_id = auth.uid()
  );
END;
$$;

-- Create a helper function to check if user is a system admin
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Drop all policies that depend on is_admin() and recreate them
DROP POLICY IF EXISTS "Admin can manage conversations config" ON public.conversations_config;
DROP POLICY IF EXISTS "Admin can manage FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Admin can update FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Admin can delete FAQs" ON public.faqs;
DROP POLICY IF EXISTS "Admin can manage plan restrictions" ON public.plan_restrictions;
DROP POLICY IF EXISTS "Admin can view admin notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "Admin can view audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Session owners and admins can delete participants" ON public.session_participants;

-- Recreate policies using the new system admin function
CREATE POLICY "System admin can manage conversations config" 
ON public.conversations_config 
FOR ALL 
USING (public.is_system_admin());

CREATE POLICY "System admin can manage FAQs" 
ON public.faqs 
FOR ALL 
USING (public.is_system_admin());

CREATE POLICY "System admin can view admin notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (public.is_system_admin());

CREATE POLICY "System admin can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (public.is_system_admin());

CREATE POLICY "System admin can manage plan restrictions" 
ON public.plan_restrictions 
FOR ALL 
USING (public.is_system_admin());

-- For session participants, allow session hosts OR system admins to delete participants
CREATE POLICY "Session hosts and system admins can delete participants" 
ON public.session_participants 
FOR DELETE 
USING (
  public.is_session_host(conversation_id) OR 
  public.is_system_admin()
);

-- Update session_participants table to use is_host instead of is_admin
ALTER TABLE public.session_participants 
RENAME COLUMN is_admin TO is_host;

-- Now we can safely drop the old function
DROP FUNCTION IF EXISTS public.is_admin();
