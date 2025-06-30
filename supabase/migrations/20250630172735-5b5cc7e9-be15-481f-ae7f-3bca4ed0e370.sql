
-- Create trigger function to automatically update conversation participant count
CREATE OR REPLACE FUNCTION update_conversation_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (participant joins)
  IF TG_OP = 'INSERT' THEN
    UPDATE conversations 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM session_participants 
      WHERE conversation_id = NEW.conversation_id
    )
    WHERE id = NEW.conversation_id;
    
    -- Log the participant join event
    INSERT INTO session_events (conversation_id, event_type, data)
    VALUES (
      NEW.conversation_id,
      'participant_joined',
      jsonb_build_object(
        'participant_id', NEW.participant_id,
        'participant_name', NEW.name,
        'avatar_seed', NEW.avatar_seed,
        'is_anonymous', NEW.is_anonymous,
        'is_host', NEW.is_host,
        'timestamp', NOW()
      )
    );
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (participant leaves)
  IF TG_OP = 'DELETE' THEN
    UPDATE conversations 
    SET current_participants = (
      SELECT COUNT(*) 
      FROM session_participants 
      WHERE conversation_id = OLD.conversation_id
    )
    WHERE id = OLD.conversation_id;
    
    -- Log the participant leave event
    INSERT INTO session_events (conversation_id, event_type, data)
    VALUES (
      OLD.conversation_id,
      'participant_left',
      jsonb_build_object(
        'participant_id', OLD.participant_id,
        'participant_name', OLD.name,
        'timestamp', NOW()
      )
    );
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on session_participants table
DROP TRIGGER IF EXISTS trigger_update_participant_count ON session_participants;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT OR DELETE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_participant_count();

-- Create function to auto-start session when capacity is reached
CREATE OR REPLACE FUNCTION check_session_auto_start()
RETURNS TRIGGER AS $$
DECLARE
  max_participants INTEGER;
  session_already_started BOOLEAN;
BEGIN
  -- Only check on participant count updates
  IF OLD.current_participants IS DISTINCT FROM NEW.current_participants THEN
    -- Get max participants and session status
    SELECT participants, session_started 
    INTO max_participants, session_already_started
    FROM conversations 
    WHERE id = NEW.id;
    
    -- Auto-start if we've reached capacity and session hasn't started
    IF NEW.current_participants >= max_participants 
       AND max_participants > 0 
       AND NOT COALESCE(session_already_started, FALSE) THEN
      
      -- Start the session
      UPDATE conversations 
      SET session_started = TRUE
      WHERE id = NEW.id;
      
      -- Log the session start event
      INSERT INTO session_events (conversation_id, event_type, data)
      VALUES (
        NEW.id,
        'session_auto_started',
        jsonb_build_object(
          'participant_count', NEW.current_participants,
          'max_participants', max_participants,
          'timestamp', NOW(),
          'trigger', 'capacity_reached'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on conversations table for auto-start
DROP TRIGGER IF EXISTS trigger_check_session_auto_start ON conversations;
CREATE TRIGGER trigger_check_session_auto_start
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION check_session_auto_start();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_session_participants_conversation_id ON session_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_current_participants ON conversations(current_participants);
CREATE INDEX IF NOT EXISTS idx_conversations_session_started ON conversations(session_started);
