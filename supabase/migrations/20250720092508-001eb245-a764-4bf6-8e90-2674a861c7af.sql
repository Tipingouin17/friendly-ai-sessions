
-- Clean up duplicate welcome messages for conversation 1590
DELETE FROM messages 
WHERE conversation_id = 1590 
AND role = 'assistant' 
AND id NOT IN (
  SELECT MIN(id) 
  FROM messages 
  WHERE conversation_id = 1590 
  AND role = 'assistant' 
  GROUP BY conversation_id
);

-- Update welcome message status to prevent further duplicates
UPDATE conversations 
SET welcome_message_status = 'ai_ready'
WHERE id = 1590 AND welcome_message_status IN ('ai_generating', 'pending');
