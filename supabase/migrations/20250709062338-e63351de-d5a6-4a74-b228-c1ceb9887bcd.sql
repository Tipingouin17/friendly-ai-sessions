-- Create function to generate welcome message when session starts
CREATE OR REPLACE FUNCTION generate_welcome_message_on_session_start()
RETURNS TRIGGER AS $$
DECLARE
  existing_message_count INTEGER;
  session_data RECORD;
  facilitator_data RECORD;
  welcome_content JSONB;
BEGIN
  -- Only trigger when session_started changes from false to true
  IF OLD.session_started IS DISTINCT FROM NEW.session_started AND NEW.session_started = TRUE THEN
    
    -- Check if welcome message already exists
    SELECT COUNT(*) INTO existing_message_count
    FROM messages 
    WHERE conversation_id = NEW.id;
    
    -- Only generate if no messages exist yet
    IF existing_message_count = 0 THEN
      
      -- Get session and facilitator data
      SELECT s.*, f.title as facilitator_title, f.details as facilitator_details, f.profile_picture
      INTO session_data
      FROM sessions s
      LEFT JOIN facilitators f ON s.facilitator = f.id
      WHERE s.id = NEW.sessions_id;
      
      -- Create welcome message content with rich context
      welcome_content := jsonb_build_object(
        'text', COALESCE(
          CASE 
            WHEN session_data.facilitator_title IS NOT NULL AND session_data.objective IS NOT NULL THEN
              'Welcome to ' || COALESCE(session_data.title, 'this session') || '! I''m ' || 
              session_data.facilitator_title || ', and I''m excited to have you join us today.' || chr(10) || chr(10) ||
              'Our objective for today is: ' || session_data.objective || chr(10) || chr(10) ||
              'To get us started, please introduce yourself and share what brings you to this session. ' ||
              'What are you hoping to learn or contribute?' || chr(10) || chr(10) ||
              'I''m looking forward to our discussion and learning from each of your unique perspectives!'
            ELSE
              'Welcome to your session! The facilitator will be with you shortly. ' ||
              'Please feel free to introduce yourself and share what you''d like to get out of today''s discussion.'
          END,
          'Welcome to your session! Please introduce yourself and let us know what you hope to get out of our time together.'
        ),
        'avatar', COALESCE(
          session_data.profile_picture,
          '/api/avatar?name=' || COALESCE(session_data.facilitator_title, 'Facilitator') || '&variant=beam&palette=2'
        )
      );
      
      -- Insert the welcome message
      INSERT INTO messages (
        conversation_id,
        content,
        role,
        name,
        created_at
      ) VALUES (
        NEW.id,
        welcome_content,
        'assistant',
        COALESCE(session_data.facilitator_title, 'Facilitator'),
        NOW()
      );
      
      -- Log the welcome message generation
      INSERT INTO session_events (conversation_id, event_type, data)
      VALUES (
        NEW.id,
        'welcome_message_generated',
        jsonb_build_object(
          'generation_method', 'server_side_trigger',
          'has_rich_context', session_data.facilitator_title IS NOT NULL AND session_data.objective IS NOT NULL,
          'facilitator_title', session_data.facilitator_title,
          'session_title', session_data.title,
          'timestamp', NOW()
        )
      );
      
      -- Send notification that welcome message is ready
      PERFORM pg_notify(
        'welcome_message_ready',
        json_build_object(
          'conversation_id', NEW.id,
          'generation_method', 'server_side_trigger',
          'timestamp', extract(epoch from now())
        )::text
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic welcome message generation
DROP TRIGGER IF EXISTS trigger_generate_welcome_message ON conversations;
CREATE TRIGGER trigger_generate_welcome_message
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION generate_welcome_message_on_session_start();

-- Add session status tracking field
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS welcome_message_status TEXT DEFAULT 'pending' 
CHECK (welcome_message_status IN ('pending', 'generating', 'ready', 'failed'));

-- Update existing conversations to have proper status
UPDATE conversations 
SET welcome_message_status = CASE 
  WHEN session_started = TRUE AND (SELECT COUNT(*) FROM messages WHERE conversation_id = conversations.id) > 0 THEN 'ready'
  WHEN session_started = TRUE THEN 'pending'
  ELSE 'pending'
END;