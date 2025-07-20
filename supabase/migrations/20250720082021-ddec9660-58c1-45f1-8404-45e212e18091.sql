-- Update existing status values to match new schema
UPDATE conversations 
SET welcome_message_status = 'ai_generating' 
WHERE welcome_message_status = 'generating';

UPDATE conversations 
SET welcome_message_status = 'ai_ready' 
WHERE welcome_message_status = 'ready';