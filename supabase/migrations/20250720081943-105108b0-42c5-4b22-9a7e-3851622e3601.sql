-- First, update existing status values to match new schema
UPDATE conversations 
SET welcome_message_status = 'ai_generating' 
WHERE welcome_message_status = 'generating';

UPDATE conversations 
SET welcome_message_status = 'ai_ready' 
WHERE welcome_message_status = 'ready';

-- Now update the constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_welcome_message_status_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_welcome_message_status_check 
CHECK (welcome_message_status IN ('pending', 'ai_generating', 'ai_ready', 'template_ready', 'failed'));