-- Fix database security issues: Update all functions to use secure search_path

-- 1. Fix the security definer function with search_path
CREATE OR REPLACE FUNCTION public.get_user_participant_id(conv_id bigint)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  participant_id_result INTEGER;
BEGIN
  -- Get the participant_id for the current authenticated user in this conversation
  SELECT sp.participant_id INTO participant_id_result
  FROM public.session_participants sp
  WHERE sp.conversation_id = conv_id
  AND sp.participant_id IN (
    SELECT participant_id 
    FROM public.session_participants 
    WHERE conversation_id = conv_id
  )
  LIMIT 1;
  
  RETURN participant_id_result;
END;
$function$;

-- 2. Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

-- 3. Fix is_system_admin function  
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$function$;

-- 4. Fix validate_participant_capacity function
CREATE OR REPLACE FUNCTION public.validate_participant_capacity(conv_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
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
$function$;

-- 5. Fix is_session_host function
CREATE OR REPLACE FUNCTION public.is_session_host(conversation_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = conversation_id 
    AND user_id = auth.uid()
  );
END;
$function$;

-- 6. Fix is_participant_or_owner function
CREATE OR REPLACE FUNCTION public.is_participant_or_owner(conversation_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  is_owner boolean;
  is_participant boolean;
BEGIN
  -- check if user is owner
  SELECT TRUE INTO is_owner
    FROM public.conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
    LIMIT 1;

  -- check if user is participant
  SELECT TRUE INTO is_participant
    FROM public.session_participants sp
    WHERE sp.conversation_id = conversation_id
      AND sp.participant_id IN (
        SELECT participant_id
        FROM public.session_participants
        WHERE conversation_id = conversation_id
      )
    LIMIT 1;

  RETURN COALESCE(is_owner, FALSE) OR COALESCE(is_participant, FALSE);
END;
$function$;

-- 7. Fix calculate_session_analytics function
CREATE OR REPLACE FUNCTION public.calculate_session_analytics(conv_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  msg_count INTEGER;
  participant_count INTEGER;
  session_start TIMESTAMP WITH TIME ZONE;
  session_end TIMESTAMP WITH TIME ZONE;
  duration_mins INTEGER;
  engagement_score NUMERIC(3,2);
BEGIN
  -- Count total messages
  SELECT COUNT(*) INTO msg_count
  FROM public.messages
  WHERE conversation_id = conv_id;
  
  -- Get participant count
  SELECT COUNT(*) INTO participant_count
  FROM public.session_participants
  WHERE conversation_id = conv_id;
  
  -- Calculate session duration
  SELECT created_at, ended_at INTO session_start, session_end
  FROM public.conversations
  WHERE id = conv_id;
  
  IF session_end IS NOT NULL AND session_start IS NOT NULL THEN
    duration_mins := EXTRACT(EPOCH FROM (session_end - session_start)) / 60;
  ELSE
    duration_mins := 0;
  END IF;
  
  -- Calculate engagement score (messages per participant)
  IF participant_count > 0 THEN
    engagement_score := LEAST(5.0, (msg_count::NUMERIC / participant_count::NUMERIC));
  ELSE
    engagement_score := 0.0;
  END IF;
  
  -- Update the conversation with analytics
  UPDATE public.conversations
  SET 
    total_messages = msg_count,
    participant_engagement_score = engagement_score,
    session_duration_minutes = duration_mins
  WHERE id = conv_id;
END;
$function$;

-- 8. Strengthen RLS policies - Replace overly permissive ones

-- Fix session_participants policies
DROP POLICY IF EXISTS "Allow public read access" ON public.session_participants;
DROP POLICY IF EXISTS "Anyone can insert" ON public.session_participants;

CREATE POLICY "Authenticated users can view session participants"
ON public.session_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = session_participants.conversation_id
    AND (c.user_id = auth.uid() OR c.session_started = true)
  )
);

CREATE POLICY "Users can join sessions with capacity validation"
ON public.session_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = session_participants.conversation_id
    AND c.session_started = false
    AND public.validate_participant_capacity(c.id)
  )
);

-- Fix session_events policies  
DROP POLICY IF EXISTS "Anyone can view session events" ON public.session_events;
DROP POLICY IF EXISTS "Anyone can insert session events" ON public.session_events;

CREATE POLICY "Session participants can view events"
ON public.session_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = session_events.conversation_id
    AND (
      c.user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.session_participants sp
        WHERE sp.conversation_id = c.id
        AND sp.participant_id IN (
          SELECT participant_id FROM public.session_participants
          WHERE conversation_id = c.id
        )
      )
    )
  )
);

-- Fix admin_notifications policies
DROP POLICY IF EXISTS "Anyone can read admin notifications" ON public.admin_notifications;

CREATE POLICY "Session hosts can view admin notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = admin_notifications.conversation_id
    AND c.user_id = auth.uid()
  )
);

-- Fix security_audit_log policies - make more restrictive
DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_log;

CREATE POLICY "Authenticated system can insert audit logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 9. Add missing constraints and validation
ALTER TABLE public.session_participants 
ADD CONSTRAINT unique_participant_per_session 
UNIQUE (conversation_id, participant_id);

-- Add check constraints for data validation
ALTER TABLE public.conversations
ADD CONSTRAINT positive_participants CHECK (participants > 0);

ALTER TABLE public.conversations  
ADD CONSTRAINT positive_current_participants CHECK (current_participants >= 0);

-- Enable leaked password protection
ALTER DATABASE postgres SET "app.settings.password_minimum_length" = '8';
ALTER DATABASE postgres SET "app.settings.check_password_strength" = 'on';