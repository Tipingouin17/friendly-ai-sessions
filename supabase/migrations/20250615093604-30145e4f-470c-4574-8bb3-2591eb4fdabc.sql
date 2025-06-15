
-- Reset the current_participants count for conversation 1514 to match actual participants
UPDATE conversations 
SET current_participants = (
  SELECT COUNT(*) 
  FROM session_participants 
  WHERE conversation_id = 1514
)
WHERE id = 1514;

-- Verify the fix
SELECT 
  id,
  current_participants,
  participants as max_participants,
  (SELECT COUNT(*) FROM session_participants WHERE conversation_id = conversations.id) as actual_participants
FROM conversations 
WHERE id = 1514;
