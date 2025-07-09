
-- Enable http extension for making API calls from database
CREATE EXTENSION IF NOT EXISTS http;

-- Update welcome message status enum to include AI-specific states
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_welcome_message_status_check;

ALTER TABLE conversations 
ADD CONSTRAINT conversations_welcome_message_status_check 
CHECK (welcome_message_status IN ('pending', 'generating', 'ai_generating', 'ai_ready', 'template_ready', 'failed'));

-- Create function to call AI generation edge function
CREATE OR REPLACE FUNCTION call_ai_welcome_generation(
  conversation_id_param bigint,
  facilitator_context jsonb,
  session_context jsonb
) RETURNS boolean AS $$
DECLARE
  ai_response http_response;
  ai_content text;
  facilitator_name text;
  facilitator_avatar text;
BEGIN
  -- Make HTTP request to AI generation edge function
  SELECT * INTO ai_response FROM http((
    'POST',
    'https://msahrdujupfcotujyluy.supabase.co/functions/v1/handle-facilitator-response',
    ARRAY[
      http_header('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zYWhyZHVqdXBmY290dWp5bHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA1MDg0MzQsImV4cCI6MjA1NjA4NDQzNH0.JgNJp4N2i6_LSoWzmMeIHMvXcAQDqtiJ6QMap6afSg0'),
      http_header('Content-Type', 'application/json')
    ],
    'application/json',
    json_build_object(
      'conversationId', conversation_id_param,
      'messages', '[]'::json,
      'sessionStart', true
    )::text
  ));

  -- Check if AI generation was successful
  IF ai_response.status = 200 THEN
    -- Parse the AI response and extract content
    SELECT content INTO ai_content 
    FROM json_to_record(ai_response.content::json) AS x(content text);
    
    -- Extract facilitator info for message attribution
    facilitator_name := COALESCE(facilitator_context->>'name', 'Facilitator');
    facilitator_avatar := facilitator_context->>'profilePicture';
    
    -- Insert the AI-generated welcome message
    INSERT INTO messages (
      conversation_id,
      content,
      role,
      name,
      created_at
    ) VALUES (
      conversation_id_param,
      jsonb_build_object(
        'text', ai_content,
        'avatar', facilitator_avatar
      ),
      'assistant',
      facilitator_name,
      NOW()
    );
    
    -- Update status to indicate AI generation completed
    UPDATE conversations 
    SET welcome_message_status = 'ai_ready'
    WHERE id = conversation_id_param;
    
    -- Log successful AI generation
    INSERT INTO session_events (conversation_id, event_type, data)
    VALUES (
      conversation_id_param,
      'welcome_message_generated',
      jsonb_build_object(
        'generation_method', 'ai_database_trigger',
        'has_rich_context', true,
        'facilitator_name', facilitator_name,
        'timestamp', NOW()
      )
    );
    
    RETURN true;
  ELSE
    -- AI generation failed, log the failure
    INSERT INTO session_events (conversation_id, event_type, data)
    VALUES (
      conversation_id_param,
      'ai_generation_failed',
      jsonb_build_object(
        'generation_method', 'ai_database_trigger',
        'http_status', ai_response.status,
        'error_details', ai_response.content,
        'timestamp', NOW()
      )
    );
    
    RETURN false;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  -- Handle any exceptions (timeouts, network errors, etc.)
  INSERT INTO session_events (conversation_id, event_type, data)
  VALUES (
    conversation_id_param,
    'ai_generation_error',
    jsonb_build_object(
      'generation_method', 'ai_database_trigger',
      'error_message', SQLERRM,
      'timestamp', NOW()
    )
  );
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Create enhanced template generation function
CREATE OR REPLACE FUNCTION create_template_welcome_message(
  conversation_id_param bigint,
  session_data RECORD
) RETURNS void AS $$
DECLARE
  welcome_content JSONB;
  facilitator_name text;
BEGIN
  facilitator_name := COALESCE(session_data.facilitator_title, 'Facilitator');
  
  -- Create enhanced template message
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
      '/api/avatar?name=' || facilitator_name || '&variant=beam&palette=2'
    )
  );
  
  -- Insert the template welcome message
  INSERT INTO messages (
    conversation_id,
    content,
    role,
    name,
    created_at
  ) VALUES (
    conversation_id_param,
    welcome_content,
    'assistant',
    facilitator_name,
    NOW()
  );
  
  -- Update status to indicate template generation completed
  UPDATE conversations 
  SET welcome_message_status = 'template_ready'
  WHERE id = conversation_id_param;
  
  -- Log template generation
  INSERT INTO session_events (conversation_id, event_type, data)
  VALUES (
    conversation_id_param,
    'welcome_message_generated',
    jsonb_build_object(
      'generation_method', 'enhanced_template_trigger',
      'has_rich_context', session_data.facilitator_title IS NOT NULL AND session_data.objective IS NOT NULL,
      'facilitator_name', facilitator_name,
      'timestamp', NOW()
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Replace the main trigger function with AI-first logic
CREATE OR REPLACE FUNCTION generate_welcome_message_on_session_start()
RETURNS TRIGGER AS $$
DECLARE
  existing_message_count INTEGER;
  session_data RECORD;
  has_rich_context BOOLEAN;
  facilitator_context JSONB;
  session_context JSONB;
  ai_success BOOLEAN;
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
      
      -- Determine if we have rich context for AI generation
      has_rich_context := (
        session_data.facilitator_title IS NOT NULL 
        AND session_data.objective IS NOT NULL 
        AND length(trim(session_data.facilitator_title)) > 0
        AND length(trim(session_data.objective)) > 0
      );
      
      -- If we have rich context, attempt AI generation
      IF has_rich_context THEN
        -- Set status to indicate AI generation is starting
        UPDATE conversations 
        SET welcome_message_status = 'ai_generating'
        WHERE id = NEW.id;
        
        -- Prepare context for AI generation
        facilitator_context := jsonb_build_object(
          'name', session_data.facilitator_title,
          'details', session_data.facilitator_details,
          'profilePicture', session_data.profile_picture
        );
        
        session_context := jsonb_build_object(
          'title', session_data.title,
          'objective', session_data.objective,
          'sessionType', session_data.session_type
        );
        
        -- Attempt AI generation with timeout
        SELECT call_ai_welcome_generation(NEW.id, facilitator_context, session_context) 
        INTO ai_success;
        
        -- If AI generation failed, fallback to template
        IF NOT ai_success THEN
          PERFORM create_template_welcome_message(NEW.id, session_data);
        END IF;
        
      ELSE
        -- Poor context - use template directly
        PERFORM create_template_welcome_message(NEW.id, session_data);
      END IF;
      
      -- Send notification that welcome message is ready
      PERFORM pg_notify(
        'welcome_message_ready',
        json_build_object(
          'conversation_id', NEW.id,
          'generation_method', CASE 
            WHEN has_rich_context AND ai_success THEN 'ai_database_trigger'
            ELSE 'template_database_trigger'
          END,
          'timestamp', extract(epoch from now())
        )::text
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_generate_welcome_message ON conversations;
CREATE TRIGGER trigger_generate_welcome_message
  AFTER UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION generate_welcome_message_on_session_start();
