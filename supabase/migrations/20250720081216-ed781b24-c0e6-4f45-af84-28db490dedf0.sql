-- Add the missing database function referenced in the edge function
CREATE OR REPLACE FUNCTION create_template_welcome_message(conversation_id_param bigint)
RETURNS void AS $$
DECLARE
  session_data RECORD;
  welcome_content JSONB;
BEGIN
  -- Get session and facilitator data
  SELECT s.*, f.title as facilitator_title, f.details as facilitator_details, f.profile_picture
  INTO session_data
  FROM conversations c
  JOIN sessions s ON c.sessions_id = s.id
  LEFT JOIN facilitators f ON s.facilitator = f.id
  WHERE c.id = conversation_id_param;
  
  -- Create welcome message content with basic context
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
    conversation_id_param,
    welcome_content,
    'assistant',
    COALESCE(session_data.facilitator_title, 'Facilitator'),
    NOW()
  );
  
  -- Update conversation status to indicate template welcome message is ready
  UPDATE conversations 
  SET welcome_message_status = 'template_ready'
  WHERE id = conversation_id_param;
  
  -- Log the template welcome message generation
  INSERT INTO session_events (conversation_id, event_type, data)
  VALUES (
    conversation_id_param,
    'welcome_message_generated',
    jsonb_build_object(
      'generation_method', 'template_fallback',
      'has_rich_context', session_data.facilitator_title IS NOT NULL AND session_data.objective IS NOT NULL,
      'facilitator_title', session_data.facilitator_title,
      'session_title', session_data.title,
      'timestamp', NOW()
    )
  );
  
END;
$$ LANGUAGE plpgsql;