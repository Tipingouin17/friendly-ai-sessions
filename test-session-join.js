// Quick test script to check session 1596
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSession() {
    console.log('Checking session 1596...');

    // Check if session exists
    const { data: session, error: sessionError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', 1596)
        .single();

    if (sessionError) {
        console.error('Error fetching session:', sessionError);
        return;
    }

    console.log('Session data:', JSON.stringify(session, null, 2));

    // Check participants
    const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .eq('conversation_id', 1596);

    if (participantsError) {
        console.error('Error fetching participants:', participantsError);
    } else {
        console.log('Participants:', JSON.stringify(participants, null, 2));
    }
}

testSession().catch(console.error);
