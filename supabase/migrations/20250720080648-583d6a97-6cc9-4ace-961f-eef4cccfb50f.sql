
-- Update the welcome message generation function to use AI instead of templates
CREATE OR REPLACE FUNCTION generate_welcome_message_on_session_start()
RETURNS TRIGGER AS $$
DECLARE
  existing_message_count INTEGER;
  session_data RECORD;
  has_rich_context BOOLEAN;
BEGIN
  -- Only trigger when session_started changes from false to true
  IF OLD.session_started IS DISTINCT FROM NEW.session_started AND NEW.session_started = TRUE THEN
    
    -- Check if welcome message already exists
    SELECT COUNT(*) INTO existing_message_count
    FROM messages 
    WHERE conversation_id = NEW.id;
    
    -- Only generate if no messages exist yet
    IF existing_message_count = 0 THEN
      
      -- Get session and facilitator data to check context quality
      SELECT s.*, f.title as facilitator_title, f.details as facilitator_details, f.profile_picture
      INTO session_data
      FROM sessions s
      LEFT JOIN facilitators f ON s.facilitator = f.id
      WHERE s.id = NEW.sessions_id;
      
      -- Determine if we have rich context for AI generation
      has_rich_context := (
        session_data.facilitator_title IS NOT NULL 
        AND session_data.objective IS NOT NULL 
        AND length(trim(session_data.facilitator_title)) > 0
        AND length(trim(session_data.objective)) > 0
      );
      
      -- Set status to indicate AI generation is starting
      UPDATE conversations 
      SET welcome_message_status = 'ai_generating'
      WHERE id = NEW.id;
      
      -- Log that we're delegating to AI generation
      INSERT INTO session_events (conversation_id, event_type, data)
      VALUES (
        NEW.id,
        'welcome_message_ai_generation_started',
        jsonb_build_object(
          'has_rich_context', has_rich_context,
          'facilitator_title', session_data.facilitator_title,
          'session_title', session_data.title,
          'participant_description', NEW.participant_description,
          'language', NEW.language,
          'timestamp', NOW(),
          'generation_method', 'ai_edge_function_delegation'
        )
      );
      
      -- Send notification to trigger AI generation via edge function
      PERFORM pg_notify(
        'generate_ai_welcome_message',
        json_build_object(
          'conversation_id', NEW.id,
          'has_rich_context', has_rich_context,
          'timestamp', extract(epoch from now())
        )::text
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update welcome message status enum to include new AI-specific states
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_welcome_message_status_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_welcome_message_status_check 
CHECK (welcome_message_status IN ('pending', 'ai_generating', 'ai_ready', 'template_ready', 'failed'));
