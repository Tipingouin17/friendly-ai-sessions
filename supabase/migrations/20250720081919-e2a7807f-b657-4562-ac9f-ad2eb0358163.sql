-- Update the welcome message status enum to include new AI-specific states
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_welcome_message_status_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_welcome_message_status_check 
CHECK (welcome_message_status IN ('pending', 'ai_generating', 'ai_ready', 'template_ready', 'failed'));