
-- Add DELETE policy for session_participants table
-- This allows session owners and admins to remove participants
CREATE POLICY "Session owners and admins can delete participants" 
ON public.session_participants 
FOR DELETE 
USING (
  -- Allow if user is the conversation owner
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = session_participants.conversation_id 
    AND user_id = auth.uid()
  )
  OR
  -- Allow if user is an admin
  public.is_admin()
);
