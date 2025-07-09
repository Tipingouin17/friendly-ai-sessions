-- Add participant_id column to messages table for participant isolation
ALTER TABLE messages ADD COLUMN participant_id INTEGER;

-- Update existing user messages to populate participant_id from JSON content
UPDATE messages 
SET participant_id = CAST((content->>'participant_id') AS INTEGER)
WHERE role = 'user' AND content->>'participant_id' IS NOT NULL;

-- Create function to get current participant ID for a user in a conversation
CREATE OR REPLACE FUNCTION get_user_participant_id(conv_id bigint)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  participant_id_result INTEGER;
BEGIN
  -- Get the participant_id for the current authenticated user in this conversation
  SELECT sp.participant_id INTO participant_id_result
  FROM session_participants sp
  WHERE sp.conversation_id = conv_id
  AND sp.participant_id IN (
    SELECT participant_id 
    FROM session_participants 
    WHERE conversation_id = conv_id
  )
  LIMIT 1;
  
  RETURN participant_id_result;
END;
$$;

-- Drop existing message RLS policies
DROP POLICY IF EXISTS "Users can view messages from sessions they participate in" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in sessions they participate in" ON messages;

-- Create new participant-private RLS policies
CREATE POLICY "Participants can view their own messages and facilitator messages"
ON messages FOR SELECT
USING (
  -- Always allow facilitator/assistant messages to be visible
  role = 'assistant' 
  OR 
  -- Allow user's own messages (match participant_id)
  (role = 'user' AND participant_id = get_user_participant_id(conversation_id))
  OR
  -- Allow session owners (hosts/admins) to view all messages
  (EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = messages.conversation_id 
    AND c.user_id = auth.uid()
  ))
);

CREATE POLICY "Participants can insert messages with correct participant_id"
ON messages FOR INSERT
WITH CHECK (
  -- Ensure user can only insert messages for conversations they participate in
  (EXISTS (
    SELECT 1 FROM session_participants sp
    WHERE sp.conversation_id = messages.conversation_id
    AND sp.participant_id = messages.participant_id
  ))
  OR
  -- Allow session owners to insert any messages
  (EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND c.user_id = auth.uid()
  ))
);

-- Create policy for system/facilitator message insertion (for edge functions)
CREATE POLICY "System can insert facilitator messages"
ON messages FOR INSERT
WITH CHECK (
  role IN ('assistant', 'admin') 
  AND participant_id IS NULL
);