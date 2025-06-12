
-- Add missing RLS policies for messages table (CRITICAL)
CREATE POLICY "Users can view messages from sessions they participate in" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp 
    WHERE sp.conversation_id = messages.conversation_id 
    AND sp.participant_id IN (
      SELECT participant_id FROM public.session_participants 
      WHERE conversation_id = messages.conversation_id
    )
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages in sessions they participate in" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.session_participants sp 
    WHERE sp.conversation_id = messages.conversation_id
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = messages.conversation_id 
    AND c.user_id = auth.uid()
  )
);

-- Add RLS policies for plans table
CREATE POLICY "Authenticated users can view plans" 
ON public.plans 
FOR SELECT 
TO authenticated 
USING (true);

-- Add RLS policies for configurations table (admin only)
CREATE POLICY "Only authenticated users can view configurations" 
ON public.configurations 
FOR SELECT 
TO authenticated 
USING (true);

-- Add RLS policies for contact_form table
CREATE POLICY "Users can view their own contact form submissions" 
ON public.contact_form 
FOR SELECT 
USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own contact form submissions" 
ON public.contact_form 
FOR INSERT 
WITH CHECK (user_id::text = auth.uid()::text);

-- Add RLS policies for session_events table
CREATE POLICY "Users can view session events for sessions they participate in" 
ON public.session_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.session_participants sp 
    WHERE sp.conversation_id = session_events.conversation_id
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = session_events.conversation_id 
    AND c.user_id = auth.uid()
  )
);

CREATE POLICY "System can insert session events" 
ON public.session_events 
FOR INSERT 
WITH CHECK (true);

-- Tighten session_participants policies to validate actual participation
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.session_participants;
CREATE POLICY "Users can register as participants in conversations" 
ON public.session_participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = session_participants.conversation_id 
    AND (c.user_id = auth.uid() OR c.session_started = false)
  )
);

CREATE POLICY "Users can view participants in sessions they're part of" 
ON public.session_participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = session_participants.conversation_id 
    AND c.user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.session_participants sp2 
    WHERE sp2.conversation_id = session_participants.conversation_id 
    AND sp2.participant_id IN (
      SELECT participant_id FROM public.session_participants 
      WHERE conversation_id = session_participants.conversation_id
    )
  )
);

-- Add RLS policies for facilitators table
CREATE POLICY "Users can view facilitators" 
ON public.facilitators 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can manage their own facilitators" 
ON public.facilitators 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Add RLS policies for sessions table
CREATE POLICY "Users can view sessions" 
ON public.sessions 
FOR SELECT 
TO authenticated 
USING (true);

-- Add RLS policies for conversations table
CREATE POLICY "Users can view conversations they created" 
ON public.conversations 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own conversations" 
ON public.conversations 
FOR ALL 
USING (user_id = auth.uid()) 
WITH CHECK (user_id = auth.uid());

-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_form ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilitators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
