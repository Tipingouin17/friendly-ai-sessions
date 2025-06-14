
-- Fix recursive RLS policy for session_participants and simplify participant visibility logic

-- Remove the problematic policies if they exist
DROP POLICY IF EXISTS "Users can register as participants in conversations" ON public.session_participants;
DROP POLICY IF EXISTS "Users can view participants in sessions they're part of" ON public.session_participants;

-- Insert a new, non-recursive policy that allows viewing only if the user is the conversation owner or already a participant (avoid referencing the same table inside its own policy)

-- 1. Create a stable security definer function to check if the current user is registered or is the conversation owner
CREATE OR REPLACE FUNCTION public.is_participant_or_owner(conversation_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_owner boolean;
  is_participant boolean;
BEGIN
  -- check if user is owner
  SELECT TRUE INTO is_owner
    FROM public.conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
    LIMIT 1;

  -- check if user is participant (avoid recursion by looking up session_participants only for this session)
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
$$;

-- 2. Policy: Allow SELECT only if is_participant_or_owner returns true
CREATE POLICY "Users can view participants if participant or owner" ON public.session_participants
FOR SELECT
USING (
  public.is_participant_or_owner(conversation_id)
);

-- 3. Policy: Allow registering (insert) for a session if user is owner or the session is not started
CREATE POLICY "Users can register as participants in conversations (no recursion)" ON public.session_participants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = session_participants.conversation_id 
      AND (c.user_id = auth.uid() OR c.session_started = false)
  )
);

