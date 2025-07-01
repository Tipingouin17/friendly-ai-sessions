
/**
 * Handles late joiner scenarios by generating contextual summaries
 */

export async function generateLateJoinerSummary(
  supabase: any,
  conversationId: number,
  conversation: any,
  participants: any[],
  openaiApiKey: string,
  requestId: string
): Promise<any> {
  console.log(`👋 [${requestId}] Generating late joiner summary for conversation ${conversationId}`);
  
  try {
    // Fetch recent messages to create context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('content, role, created_at, name')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error(`❌ [${requestId}] Error fetching messages for summary:`, messagesError);
      throw messagesError;
    }

    const messageCount = recentMessages?.length || 0;
    console.log(`📝 [${requestId}] Found ${messageCount} recent messages for context`);

    // Extract facilitator and session context
    const facilitatorName = conversation?.sessions?.facilitator_details?.title || 'Facilitator';
    const sessionTitle = conversation?.sessions?.title || 'Session';
    const sessionObjective = conversation?.sessions?.objective || '';
    
    // Create contextual summary based on available messages
    let summaryContent = '';
    
    if (messageCount === 0) {
      // No messages yet, provide session introduction
      summaryContent = `Welcome to ${sessionTitle}! I'm ${facilitatorName}, and you're joining us for this session.`;
      
      if (sessionObjective) {
        summaryContent += `\n\nOur objective today is: ${sessionObjective}`;
      }
      
      summaryContent += `\n\nYou're joining at the perfect time - we're just getting started! Feel free to introduce yourself and share what brings you to this session.`;
    } else {
      // Generate AI-powered summary of recent discussion
      const conversationContext = recentMessages
        .reverse() // Put in chronological order
        .map(msg => {
          const role = msg.role === 'facilitator' ? facilitatorName : (msg.name || 'Participant');
          const content = typeof msg.content === 'string' ? msg.content : 
                         (typeof msg.content === 'object' && msg.content?.text) ? msg.content.text : 
                         JSON.stringify(msg.content);
          return `${role}: ${content}`;
        })
        .join('\n');

      const systemPrompt = `You are ${facilitatorName}, facilitating a session titled "${sessionTitle}". A new participant has just joined the session in progress. Your task is to provide them with a warm welcome and a helpful summary of what has been discussed so far.

Session Context:
- Title: ${sessionTitle}
- Objective: ${sessionObjective}
- Participant Count: ${participants.length}

Recent Discussion:
${conversationContext}

Generate a welcoming message that:
1. Welcomes the new participant warmly
2. Provides a concise summary of key discussion points
3. Invites them to participate
4. Maintains the session's tone and focus

Keep it conversational and engaging, not longer than 3-4 sentences.`;

      const userPrompt = `A new participant has just joined our ${sessionTitle} session. Please welcome them and provide a helpful summary of our discussion so far.`;

      console.log(`🤖 [${requestId}] Calling OpenAI for late joiner summary...`);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      summaryContent = data.choices?.[0]?.message?.content;
      
      if (!summaryContent) {
        throw new Error('No content received from OpenAI API');
      }
    }

    console.log(`✅ [${requestId}] Late joiner summary generated successfully`);

    return {
      content: summaryContent,
      generationMethod: messageCount === 0 ? 'late_joiner_intro' : 'late_joiner_ai_summary',
      facilitator_context: {
        name: facilitatorName,
        profilePicture: conversation?.sessions?.facilitator_details?.profile_picture || null
      },
      session_context: {
        title: sessionTitle,
        objective: sessionObjective,
        participantCount: participants.length
      },
      avatar: conversation?.sessions?.facilitator_details?.profile_picture || 
              `/api/avatar?name=${encodeURIComponent(facilitatorName)}&variant=beam&palette=2`
    };

  } catch (error) {
    console.error(`❌ [${requestId}] Late joiner summary generation failed:`, error);
    throw error;
  }
}

export async function checkIsLateJoiner(
  supabase: any,
  conversationId: number,
  requestId: string
): Promise<boolean> {
  try {
    // Check if session has already started and has messages
    const { data: conversationData, error: convError } = await supabase
      .from('conversations')
      .select('session_started, created_at')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error(`❌ [${requestId}] Error checking session status:`, convError);
      return false;
    }

    if (!conversationData?.session_started) {
      return false; // Session hasn't started yet
    }

    // Check if there are existing messages (indicating ongoing conversation)
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);

    if (msgError) {
      console.error(`❌ [${requestId}] Error checking existing messages:`, msgError);
      return false;
    }

    const hasExistingMessages = messages && messages.length > 0;
    
    console.log(`🔍 [${requestId}] Late joiner check: session_started=${conversationData.session_started}, hasMessages=${hasExistingMessages}`);
    
    return hasExistingMessages;
  } catch (error) {
    console.error(`❌ [${requestId}] Exception during late joiner check:`, error);
    return false;
  }
}
