
/**
 * Enhanced context management utilities for facilitator responses
 * Fixes database relationship queries and improves error handling
 */

export async function fetchConversationData(supabase: any, conversationId: number) {
  console.log(`🔍 Fetching conversation data for ID: ${conversationId}`);
  
  try {
    // Use a simpler, more reliable query approach
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        participant_description,
        language,
        participants,
        session_started,
        current_participants
      `)
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('❌ Error fetching conversation:', convError);
      return null;
    }

    if (!conversation) {
      console.warn('⚠️ No conversation found for ID:', conversationId);
      return null;
    }

    // Fetch session data separately to avoid relationship issues
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        id,
        title,
        objective,
        session_type,
        welcome_message,
        facilitator
      `)
      .eq('id', conversation.sessions_id)
      .single();

    if (sessionError) {
      console.error('❌ Error fetching session:', sessionError);
      // Continue without session data - we'll use fallbacks
    }

    // Fetch facilitator data separately if we have a session
    let facilitatorData = null;
    if (sessionData?.facilitator) {
      const { data: facilitator, error: facError } = await supabase
        .from('facilitators')
        .select(`
          id,
          title,
          details,
          profile_picture,
          expertise_level,
          specialties
        `)
        .eq('id', sessionData.facilitator)
        .single();

      if (facError) {
        console.error('❌ Error fetching facilitator:', facError);
      } else {
        facilitatorData = facilitator;
      }
    }

    // Combine the data in the expected format
    const combinedData = {
      ...conversation,
      sessions: sessionData ? {
        ...sessionData,
        facilitator_details: facilitatorData
      } : null
    };

    console.log('✅ Successfully fetched conversation data:', {
      conversationId,
      hasSession: !!sessionData,
      hasFacilitator: !!facilitatorData,
      facilitatorName: facilitatorData?.title,
      sessionTitle: sessionData?.title
    });

    return combinedData;

  } catch (error) {
    console.error('💥 Exception fetching conversation data:', error);
    return null;
  }
}

export async function fetchParticipantsData(supabase: any, conversationId: number) {
  console.log(`👥 Fetching participants data for conversation: ${conversationId}`);
  
  try {
    const { data: participants, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('❌ Error fetching participants:', error);
      return [];
    }

    console.log(`✅ Found ${participants?.length || 0} participants`);
    return participants || [];

  } catch (error) {
    console.error('💥 Exception fetching participants:', error);
    return [];
  }
}
