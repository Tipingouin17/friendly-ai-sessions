-- Manually insert a welcome message for conversation 1599
-- Use this to recover if AI generation failed or API keys are missing

INSERT INTO messages (conversation_id, role, name, content)
SELECT 
    1599, 
    'assistant', 
    'Facilitator',
    jsonb_build_object(
        'text', 'Welcome to the session! I am your AI Facilitator. I am here to guide our discussion and help us achieve our objectives. Please feel free to introduce yourselves.',
        'avatar', '/placeholder.png'
    )
WHERE NOT EXISTS (
    SELECT 1 FROM messages WHERE conversation_id = 1599 AND role = 'assistant'
);

-- Update status to indicate message is ready
UPDATE conversations 
SET welcome_message_status = 'ai_ready' 
WHERE id = 1599;
