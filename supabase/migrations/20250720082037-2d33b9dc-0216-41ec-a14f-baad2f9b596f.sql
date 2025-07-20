-- Add the updated constraint
ALTER TABLE conversations 
ADD CONSTRAINT conversations_welcome_message_status_check 
CHECK (welcome_message_status IN ('pending', 'ai_generating', 'ai_ready', 'template_ready', 'failed'));