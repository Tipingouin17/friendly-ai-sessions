-- Step 3: Add immediate database event listening with pg_notify
-- Modify the existing trigger to add immediate notifications

-- First, create a function to handle participant count updates with notifications
CREATE OR REPLACE FUNCTION public.update_conversation_participant_count_with_notify()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
    
    -- Send immediate notification for participant join
    PERFORM pg_notify(
      'participant_joined', 
      json_build_object(
        'conversation_id', NEW.conversation_id,
        'participant_id', NEW.participant_id,
        'participant_name', NEW.name,
        'avatar_seed', NEW.avatar_seed,
        'current_count', (SELECT current_participants FROM conversations WHERE id = NEW.conversation_id),
        'max_count', (SELECT participants FROM conversations WHERE id = NEW.conversation_id),
        'timestamp', extract(epoch from now())
      )::text
    );
    
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
    
    -- Send immediate notification for participant leave
    PERFORM pg_notify(
      'participant_left', 
      json_build_object(
        'conversation_id', OLD.conversation_id,
        'participant_id', OLD.participant_id,
        'participant_name', OLD.name,
        'current_count', (SELECT current_participants FROM conversations WHERE id = OLD.conversation_id),
        'timestamp', extract(epoch from now())
      )::text
    );
    
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
$function$;

-- Update the existing trigger to use the new function
DROP TRIGGER IF EXISTS update_participant_count_trigger ON session_participants;
CREATE TRIGGER update_participant_count_trigger
  AFTER INSERT OR DELETE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION update_conversation_participant_count_with_notify();

-- Also enhance the session auto-start trigger with immediate notifications
CREATE OR REPLACE FUNCTION public.check_session_auto_start_with_notify()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
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
      
      -- Send immediate notification for session auto-start
      PERFORM pg_notify(
        'session_auto_started', 
        json_build_object(
          'conversation_id', NEW.id,
          'participant_count', NEW.current_participants,
          'max_participants', max_participants,
          'timestamp', extract(epoch from now()),
          'trigger', 'capacity_reached'
        )::text
      );
      
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
$function$;

-- Update the existing auto-start trigger
DROP TRIGGER IF EXISTS check_session_auto_start_trigger ON conversations;
CREATE TRIGGER check_session_auto_start_trigger
  AFTER UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION check_session_auto_start_with_notify();