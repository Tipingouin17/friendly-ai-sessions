-- First, remove the constraint entirely
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_welcome_message_status_check;