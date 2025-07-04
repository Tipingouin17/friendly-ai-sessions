
/**
 * Enhanced AI generation utilities with proper context handling
 */

import { extractFacilitatorContext, extractSessionContext, createContextualSystemPrompt } from "./enhanced-context-extractor.ts";

export async function generateAIWelcomeMessage(
  conversation: any,
  participants: any[],
  openaiApiKey: string,
  requestId: string
): Promise<any> {
  console.log(`🤖 [${requestId}] Starting AI welcome message generation`);
  console.log(`📊 [${requestId}] Input data analysis:`, {
    conversationId: conversation?.id,
    hasConversation: !!conversation,
    participantCount: participants?.length || 0,
    hasOpenAIKey: !!openaiApiKey,
    sessionData: {
      hasSession: !!conversation?.sessions,
      facilitatorTitle: conversation?.sessions?.facilitator_details?.title,
      sessionTitle: conversation?.sessions?.title,
      objective: conversation?.sessions?.objective,
      participantDescription: conversation?.participant_description
    }
  });
  
  try {
    // Extract enhanced context
    const facilitatorContext = extractFacilitatorContext(conversation);
    const sessionContext = extractSessionContext(conversation, participants);
    
    console.log(`📋 [${requestId}] AI generation context extracted:`, {
      facilitatorName: facilitatorContext.name,
      facilitatorDetails: facilitatorContext.details,
      facilitatorPicture: facilitatorContext.profilePicture,
      sessionTitle: sessionContext.title,
      sessionObjective: sessionContext.objective,
      participantCount: sessionContext.participantCount,
      participantDescription: sessionContext.participantDescription,
      hasSessionData: !!conversation?.sessions,
      hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
    });
    
    // Only proceed with AI generation if we have rich context
    if (!conversation?.sessions?.facilitator_details?.title || !conversation?.sessions?.objective) {
      console.log(`⚠️ [${requestId}] Insufficient context for AI generation - missing required fields:`, {
        hasFacilitatorTitle: !!conversation?.sessions?.facilitator_details?.title,
        hasObjective: !!conversation?.sessions?.objective,
        availableData: Object.keys(conversation?.sessions || {})
      });
      return null; // This will trigger fallback to template
    }
    
    // Create contextual system prompt
    const systemPrompt = createContextualSystemPrompt(
      facilitatorContext,
      sessionContext,
      'early',
      true // isSessionStart
    );
    
    const userPrompt = `Generate a warm, engaging welcome message for this ${sessionContext.sessionType} session. The session just started automatically when we reached ${sessionContext.participantCount} ${sessionContext.participantDescription}. Make it personal and set the tone for productive collaboration.`;
    
    console.log(`🚀 [${requestId}] Calling OpenAI API for AI generation with rich context...`);
    console.log(`📝 [${requestId}] OpenAI request details:`, {
      model: 'gpt-4o-mini',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      maxTokens: 500,
      temperature: 0.7,
      systemPromptPreview: systemPrompt.substring(0, 200) + '...',
      userPromptPreview: userPrompt.substring(0, 200) + '...'
    });
    
    const apiStartTime = Date.now();
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
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`⏱️ [${requestId}] OpenAI API call completed in ${apiDuration}ms with status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [${requestId}] OpenAI API error response:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        duration: apiDuration
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    console.log(`📊 [${requestId}] OpenAI API response analysis:`, {
      hasChoices: !!data.choices,
      choicesLength: data.choices?.length || 0,
      hasContent: !!aiContent,
      contentLength: aiContent?.length || 0,
      usage: data.usage,
      finishReason: data.choices?.[0]?.finish_reason
    });
    
    if (!aiContent) {
      console.error(`❌ [${requestId}] No content received from OpenAI API:`, {
        responseData: data,
        choices: data.choices
      });
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI welcome message generated successfully:`, {
      contentLength: aiContent.length,
      model: 'gpt-4o-mini',
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title,
      duration: apiDuration,
      tokensUsed: data.usage?.total_tokens,
      contentPreview: aiContent.substring(0, 150) + '...'
    });
    
    const result = {
      content: aiContent,
      generationMethod: 'ai',
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      avatar: facilitatorContext.profilePicture || '/api/avatar?name=' + encodeURIComponent(facilitatorContext.name) + '&variant=beam&palette=2'
    };
    
    console.log(`🎉 [${requestId}] AI generation result prepared:`, {
      hasContent: !!result.content,
      contentLength: result.content.length,
      generationMethod: result.generationMethod,
      hasAvatar: !!result.avatar,
      facilitatorName: result.facilitator_context.name,
      sessionTitle: result.session_context.title
    });
    
    return result;
    
  } catch (error) {
    console.error(`❌ [${requestId}] AI generation failed:`, {
      error: error.message,
      stack: error.stack,
      conversationId: conversation?.id,
      facilitatorTitle: conversation?.sessions?.facilitator_details?.title
    });
    throw error;
  }
}

export async function generateAISubsequentMessage(
  supabase: any,
  conversationId: number,
  conversation: any,
  participants: any[],
  messages: any[],
  openaiApiKey: string,
  requestId: string
): Promise<any> {
  console.log(`🤖 [${requestId}] Starting AI subsequent message generation`);
  
  try {
    // Extract enhanced context
    const facilitatorContext = extractFacilitatorContext(conversation);
    const sessionContext = extractSessionContext(conversation, participants);
    
    // Fetch recent messages for context
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('content, role, created_at, name, participant')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messagesError) {
      console.error(`❌ [${requestId}] Error fetching messages for context:`, messagesError);
      throw messagesError;
    }

    const messageCount = recentMessages?.length || 0;
    console.log(`📝 [${requestId}] Found ${messageCount} recent messages for context`);

    // Determine conversation progress
    let conversationProgress = 'early';
    if (messageCount > 15) {
      conversationProgress = 'concluding';
    } else if (messageCount > 5) {
      conversationProgress = 'middle';
    }

    // Analyze recent participant messages for themes
    const participantMessages = recentMessages
      ?.filter(msg => msg.role === 'user')
      ?.slice(0, 5) || [];

    const conversationContext = participantMessages
      .reverse() // Put in chronological order
      .map(msg => {
        const participantName = msg.name || msg.participant || 'Participant';
        const content = typeof msg.content === 'string' ? msg.content : 
                       (typeof msg.content === 'object' && msg.content?.text) ? msg.content.text : 
                       JSON.stringify(msg.content);
        return `${participantName}: ${content}`;
      })
      .join('\n');

    // Create contextual system prompt for subsequent messages
    const systemPrompt = createContextualSystemPrompt(
      facilitatorContext,
      sessionContext,
      conversationProgress,
      false // not session start
    );

    // Create user prompt based on conversation context
    let userPrompt = `Based on the recent discussion below, generate a thoughtful facilitator response that:
1. Acknowledges key points raised by participants
2. Asks follow-up questions to deepen the discussion
3. Guides the conversation toward the session objective
4. Encourages participation from all ${sessionContext.participantCount} ${sessionContext.participantDescription}
5. Maintains the facilitator's expertise and persona

Recent conversation:
${conversationContext}

Session progress: ${conversationProgress} stage
Session objective: ${sessionContext.objective}

Generate a response that moves the conversation forward constructively.`;

    if (participantMessages.length === 0) {
      userPrompt = `No participant messages have been received yet. Generate a gentle prompt to encourage the first participant to share their thoughts about ${sessionContext.objective}. Keep it welcoming and specific to the ${sessionContext.sessionType} context.`;
    }

    console.log(`🚀 [${requestId}] Calling OpenAI API for subsequent message generation...`);

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
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI subsequent message generated successfully:`, {
      contentLength: aiContent.length,
      model: 'gpt-4o-mini',
      conversationProgress,
      participantMessageCount: participantMessages.length,
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title
    });
    
    return {
      content: aiContent,
      generationMethod: 'ai_subsequent',
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      avatar: facilitatorContext.profilePicture || '/api/avatar?name=' + encodeURIComponent(facilitatorContext.name) + '&variant=beam&palette=2'
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] AI subsequent message generation failed:`, error);
    throw error;
  }
}

export function generateEnhancedTemplateMessage(
  conversation: any,
  participants: any[],
  requestId: string
): any {
  console.log(`📝 [${requestId}] Generating enhanced template message`);
  
  // Extract context for template
  const facilitatorContext = extractFacilitatorContext(conversation);
  const sessionContext = extractSessionContext(conversation, participants);
  
  let templateContent = `Welcome to ${sessionContext.title}! I'm ${facilitatorContext.name}, and I'm excited to have you join us today.\n\n`;
  
  if (facilitatorContext.details && facilitatorContext.details !== 'Professional session facilitator with expertise in group dynamics and engagement.') {
    templateContent += `A bit about me: ${facilitatorContext.details}\n\n`;
  }
  
  templateContent += `Our objective for today is: ${sessionContext.objective}\n\n`;
  
  if (sessionContext.participantCount > 1) {
    templateContent += `I see we have ${sessionContext.participantCount} ${sessionContext.participantDescription} here today. `;
  }
  
  templateContent += `To get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?\n\n`;
  templateContent += `I'm looking forward to our discussion and learning from each of your unique perspectives!`;
  
  console.log(`✅ [${requestId}] Enhanced template message generated:`, {
    contentLength: templateContent.length,
    facilitatorName: facilitatorContext.name,
    sessionTitle: sessionContext.title
  });
  
  return {
    content: templateContent,
    generationMethod: 'enhanced_template',
    facilitator_context: facilitatorContext,
    session_context: sessionContext,
    avatar: facilitatorContext.profilePicture || '/api/avatar?name=' + encodeURIComponent(facilitatorContext.name) + '&variant=beam&palette=2'
  };
}
