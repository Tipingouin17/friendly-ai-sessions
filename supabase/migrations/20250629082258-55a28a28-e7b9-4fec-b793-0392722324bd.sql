
-- Update the existing policy to allow system admins to delete participants
DROP POLICY IF EXISTS "Session hosts and system admins can delete participants" ON public.session_participants;

CREATE POLICY "Session hosts and system admins can delete participants" 
ON public.session_participants 
FOR DELETE 
USING (
  -- Allow if user is the conversation owner (session host)
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = session_participants.conversation_id 
    AND user_id = auth.uid()
  )
  OR
  -- Allow if user is a system admin
  public.is_system_admin()
  OR
  -- Allow if user is marked as host in the session
  EXISTS (
    SELECT 1 FROM public.session_participants sp
    WHERE sp.conversation_id = session_participants.conversation_id
    AND sp.is_host = true
    AND sp.participant_id IN (
      SELECT participant_id FROM public.session_participants
      WHERE conversation_id = session_participants.conversation_id
    )
  )
);
