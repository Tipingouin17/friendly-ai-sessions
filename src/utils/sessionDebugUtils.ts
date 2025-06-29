
import { supabase } from "@/integrations/supabase/client";

/**
 * Debug utility to manually trigger welcome message generation for a specific session
 */
export async function debugGenerateWelcomeMessage(conversationId: number) {
  try {
    console.log(`🔧 Debug: Manually triggering welcome message generation for session ${conversationId}`);
    
    // First, fetch the conversation data to verify context
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        participants,
        participant_description,
        language,
        sessions!conversations_sessions_id_fkey (
          id,
          title,
          objective,
          welcome_message,
          session_type,
          facilitator,
          facilitator_details:facilitators!sessions_facilitator_fkey (
            id,
            title,
            profile_picture,
            details,
            description,
            expertise_level,
            specialties,
            languages
          )
        )
      `)
      .eq('id', conversationId)
      .maybeSingle();

    if (convError || !conversation) {
      console.error('❌ Failed to fetch conversation data:', convError);
      return { success: false, error: 'Conversation not found' };
    }

    console.log('📋 Retrieved conversation context:', {
      facilitatorName: conversation.sessions?.facilitator_details?.title,
      objective: conversation.sessions?.objective,
      participantDescription: conversation.participant_description,
      participantCount: conversation.participants
    });

    // Call the edge function to generate welcome message
    const { data: response, error: funcError } = await supabase.functions.invoke('handle-facilitator-response', {
      body: {
        messages: [],
        conversationId,
        sessionStart: true,
        generateReport: false,
        conversation
      }
    });

    if (funcError) {
      console.error('❌ Edge function error:', funcError);
      return { success: false, error: funcError.message };
    }

    if (!response?.content) {
      console.error('❌ Empty response from edge function');
      return { success: false, error: 'Empty response' };
    }

    console.log('✅ Successfully generated welcome message:', {
      contentLength: response.content.length,
      hasAvatar: !!response.avatar
    });

    // Save the welcome message to the database
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: { text: response.content },
        role: 'assistant',
        name: conversation.sessions?.facilitator_details?.title || 'Facilitator'
      });

    if (insertError) {
      console.error('❌ Failed to save welcome message:', insertError);
      return { success: false, error: 'Failed to save message' };
    }

    return { 
      success: true, 
      message: response.content,
      facilitatorName: conversation.sessions?.facilitator_details?.title 
    };

  } catch (error) {
    console.error('💥 Debug generate welcome message error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Test the edge function directly with session 1529 data
 */
export async function testEdgeFunction(conversationId: number = 1529) {
  try {
    console.log(`🧪 Testing edge function with session ${conversationId}`);
    
    const result = await supabase.functions.invoke('handle-facilitator-response', {
      body: {
        messages: [],
        conversationId,
        sessionStart: true,
        generateReport: false
      }
    });

    console.log('🧪 Edge function test result:', result);
    return result;
  } catch (error) {
    console.error('💥 Edge function test error:', error);
    return { error };
  }
}

// Make these available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).debugGenerateWelcomeMessage = debugGenerateWelcomeMessage;
  (window as any).testEdgeFunction = testEdgeFunction;
}
