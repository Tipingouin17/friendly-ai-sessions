
-- Phase 1: Critical RLS Policy Fixes

-- Enable RLS on tables missing proper security
ALTER TABLE public.conversations_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create a function to check if user is admin (avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Conversations config - Admin only access
CREATE POLICY "Admin can manage conversations config" 
ON public.conversations_config 
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- FAQs - Public read, admin write
CREATE POLICY "Anyone can view FAQs" 
ON public.faqs 
FOR SELECT 
USING (true);

CREATE POLICY "Admin can manage FAQs" 
ON public.faqs 
FOR INSERT 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update FAQs" 
ON public.faqs 
FOR UPDATE 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete FAQs" 
ON public.faqs 
FOR DELETE 
USING (public.is_admin());

-- Plan restrictions - Authenticated read, admin write
CREATE POLICY "Authenticated users can view plan restrictions" 
ON public.plan_restrictions 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admin can manage plan restrictions" 
ON public.plan_restrictions 
FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- Tighten admin notifications to admin users only
DROP POLICY IF EXISTS "System can insert session events" ON public.admin_notifications;
CREATE POLICY "Admin can view admin notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (public.is_admin());

CREATE POLICY "System can create admin notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (true);

-- Enhanced session participants validation
DROP POLICY IF EXISTS "Users can register as participants in conversations (no recursion)" ON public.session_participants;
CREATE POLICY "Users can register as participants with validation" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = session_participants.conversation_id 
    AND (
      c.user_id = auth.uid() OR 
      (c.session_started = false AND c.current_participants < c.participants)
    )
  )
);

-- Add function to validate participant capacity
CREATE OR REPLACE FUNCTION public.validate_participant_capacity(conv_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count integer;
  max_capacity integer;
BEGIN
  SELECT current_participants, participants 
  INTO current_count, max_capacity
  FROM public.conversations 
  WHERE id = conv_id;
  
  RETURN current_count < max_capacity;
END;
$$;

-- Add trigger to validate capacity before participant insertion
CREATE OR REPLACE FUNCTION public.check_participant_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT public.validate_participant_capacity(NEW.conversation_id) THEN
    RAISE EXCEPTION 'Session is at maximum capacity';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_capacity_before_insert
  BEFORE INSERT ON public.session_participants
  FOR EACH ROW EXECUTE FUNCTION public.check_participant_capacity();

-- Add audit logging table for security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can view all audit logs
CREATE POLICY "Admin can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (public.is_admin());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);
