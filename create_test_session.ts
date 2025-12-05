
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dsnfzlavmakmsnbvntgs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbmZ6bGF2bWFrbXNuYnZudGdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzgzOTIsImV4cCI6MjA4MDAxNDM5Mn0.hZh2gss_JWYFTQOUHLIYzSMn2TToxS8xIQqOXj821cc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createSession() {
  console.log('Creating test session...');

  // 1. Get a facilitator
  const { data: facilitators, error: fError } = await supabase
    .from('facilitators')
    .select('id')
    .limit(1);

  if (fError) {
    console.error('Error fetching facilitator:', fError);
    return;
  }
  
  if (!facilitators || facilitators.length === 0) {
      console.error('No facilitators found. Cannot create session.');
      return;
  }

  const facilitatorId = facilitators[0].id;
  console.log('Using facilitator:', facilitatorId);

  // 2. Create a session
  const { data: session, error: sError } = await supabase
    .from('sessions')
    .insert({
      title: 'Test Session ' + Date.now(),
      objective: 'Testing welcome message generation',
      facilitator_id: facilitatorId,
      status: 'active'
    })
    .select()
    .single();

  if (sError) {
    console.error('Error creating session:', sError);
    return;
  }
  console.log('Created session:', session.id);

  // 3. Create a conversation
  const { data: conversation, error: cError } = await supabase
    .from('conversations')
    .insert({
      sessions_id: session.id,
      status: 'active',
      session_started: true, // Start immediately to trigger welcome message
      welcome_message_status: 'pending',
      participant_description: 'Testers'
    })
    .select()
    .single();

  if (cError) {
    console.error('Error creating conversation:', cError);
    return;
  }
  console.log('Created conversation:', conversation.id);
  console.log('Join URL:', `http://localhost:8080/join-session?id=${conversation.id}`);
}

createSession();
