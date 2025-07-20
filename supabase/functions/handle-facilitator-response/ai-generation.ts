/**
 * Enhanced AI generation utilities with proper context handling
 */

/**
 * Generate a context-aware AI welcome message for session start
 * This function is called when a session starts and no welcome message exists yet
 */
export async function generateAIWelcomeMessageForSessionStart(
  supabase: any,
  conversationId: number,
  conversation: any,
  participants: any[],
  openaiApiKey: string,
  requestId: string
): Promise<any> {
  try {
    console.log(`🎯 [${requestId}] [AI-TRACKING] Starting AI welcome message generation for session start`);
    
    const facilitatorContext = extractFacilitatorContext(conversation);
    const sessionContext = extractSessionContext(conversation, participants);
    
    // Get participant and language context
    const participantDescription = conversation?.participant_description || 'participants';
    const sessionLanguage = conversation?.language || 'en';
    
    console.log(`🌍 [${requestId}] [AI-TRACKING] Welcome message context:`, {
      facilitatorName: facilitatorContext.name,
      sessionTitle: sessionContext.title,
      participantDescription,
      sessionLanguage,
      participantCount: participants?.length || 0,
      hasObjective: !!sessionContext.objective
    });

    // Create language-specific and context-aware welcome message prompt
    const systemPrompt = createContextualWelcomeSystemPrompt(
      facilitatorContext,
      sessionContext,
      participantDescription,
      sessionLanguage
    );

    const userPrompt = createWelcomeUserPrompt(
      sessionContext,
      participantDescription,
      sessionLanguage,
      participants?.length || 0
    );

    console.log(`📝 [${requestId}] [AI-TRACKING] Welcome message prompts created:`, {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      language: sessionLanguage,
      participantType: participantDescription
    });

    console.log(`🚀 [${requestId}] Calling OpenAI API for welcome message generation...`);

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
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`⏱️ [${requestId}] OpenAI API call completed in ${apiDuration}ms with status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [${requestId}] OpenAI API error:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        duration: apiDuration
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      console.error(`❌ [${requestId}] No content received from OpenAI for welcome message`);
      throw new Error('No content received from OpenAI API for welcome message');
    }

    // Create the welcome message record and insert it into the database
    const welcomeMessageData = {
      conversation_id: conversationId,
      content: {
        text: aiContent,
        avatar: facilitatorContext.avatar
      },
      role: 'assistant',
      name: facilitatorContext.name,
      created_at: new Date().toISOString()
    };

    console.log(`💾 [${requestId}] Inserting AI welcome message into database...`);
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert(welcomeMessageData)
      .select()
      .single();

    if (insertError) {
      console.error(`❌ [${requestId}] Error inserting welcome message:`, insertError);
      throw new Error(`Failed to insert welcome message: ${insertError.message}`);
    }

    // Update conversation status to indicate AI welcome message is ready
    await supabase
      .from('conversations')
      .update({ welcome_message_status: 'ai_ready' })
      .eq('id', conversationId);

    console.log(`✅ [${requestId}] [AI-TRACKING] AI welcome message generated and stored successfully:`, {
      contentLength: aiContent.length,
      language: sessionLanguage,
      participantType: participantDescription,
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title,
      duration: apiDuration,
      tokensUsed: data.usage?.total_tokens,
      messageId: insertedMessage?.id
    });

    return {
      content: aiContent,
      avatar: facilitatorContext.avatar,
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      generationMethod: 'ai_welcome_session_start',
      insertedMessage
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] [AI-TRACKING] AI welcome message generation failed:`, {
      error: error.message,
      stack: error.stack,
      conversationId,
      facilitatorTitle: conversation?.sessions?.facilitator_details?.title
    });
    
    // Update conversation status to indicate failure, will fall back to template
    try {
      await supabase
        .from('conversations')
        .update({ welcome_message_status: 'failed' })
        .eq('id', conversationId);
    } catch (statusError) {
      console.error(`❌ [${requestId}] Error updating welcome message status to failed:`, statusError);
    }
    
    throw error;
  }
}

/**
 * Create system prompt for context-aware welcome messages
 */
function createContextualWelcomeSystemPrompt(
  facilitatorContext: any,
  sessionContext: any,
  participantDescription: string,
  language: string
): string {
  const languageInstructions = getLanguageInstructions(language);
  
  return `You are ${facilitatorContext.name}, an expert facilitator. ${facilitatorContext.details || ''}

${languageInstructions}

Your role is to create a warm, personalized welcome message for the start of this session. Consider:

SESSION CONTEXT:
- Title: ${sessionContext.title}
- Objective: ${sessionContext.objective}
- Participants: ${participantDescription}

PERSONALIZATION REQUIREMENTS:
1. Address the specific participant type ("${participantDescription}") appropriately
2. Connect the session objective to their likely interests and context
3. Use professional but warm tone suitable for the participant group
4. Reference relevant aspects of your expertise that relate to their field
5. Create an inclusive, engaging opening that encourages participation

WELCOME MESSAGE STRUCTURE:
1. Enthusiastic greeting and self-introduction
2. Brief mention of session title and its relevance to their field
3. Clear statement of the session objective tailored to their context
4. Invitation to participate and share perspectives
5. Express genuine interest in learning from their unique perspectives

Make the welcome message feel personally crafted for this specific group of ${participantDescription} while maintaining professionalism and expertise.`;
}

/**
 * Create user prompt for welcome message generation
 */
function createWelcomeUserPrompt(
  sessionContext: any,
  participantDescription: string,
  language: string,
  participantCount: number
): string {
  const languagePhrase = language === 'fr' ? 'en français' : 'in English';
  
  return `Generate a personalized welcome message ${languagePhrase} for a session titled "${sessionContext.title}" with the objective: "${sessionContext.objective}"

The participants are described as: "${participantDescription}"
Expected participant count: ${participantCount}

Create a welcome message that:
1. Shows genuine enthusiasm for working with this specific type of participant
2. Connects the session topic to their likely professional interests and challenges
3. Uses appropriate terminology and examples relevant to their field
4. Encourages active participation and knowledge sharing
5. Sets a collaborative, professional tone for the discussion

The message should be approximately 3-4 paragraphs and feel personally crafted for this audience.`;
}

/**
 * Get language-specific instructions for AI generation
 */
function getLanguageInstructions(language: string): string {
  switch (language.toLowerCase()) {
    case 'fr':
    case 'french':
      return 'IMPORTANT: Vous devez répondre entièrement en français. Utilisez un français professionnel et chaleureux.';
    case 'es':
    case 'spanish':
      return 'IMPORTANTE: Debes responder completamente en español. Usa un español profesional y cálido.';
    case 'de':
    case 'german':
      return 'WICHTIG: Sie müssen vollständig auf Deutsch antworten. Verwenden Sie professionelles und warmes Deutsch.';
    default:
      return 'IMPORTANT: You must respond entirely in English. Use professional and warm English.';
  }
}

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
    
    // Fetch recent messages for context - FIXED: using participant_id instead of participant
    const { data: recentMessages, error: messagesError } = await supabase
      .from('messages')
      .select('content, role, created_at, name, participant_id')
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
        // Use participant_id to find participant name
        const participantInfo = participants?.find(p => p.participant_id === msg.participant_id);
        const participantName = participantInfo ? participantInfo.name : `Participant ${msg.participant_id || 'Unknown'}`;
        const content = typeof msg.content === 'string' ? msg.content : 
                       (typeof msg.content === 'object' && msg.content?.text) ? msg.content.text : 
                       JSON.stringify(msg.content);
        return `${participantName}: ${content}`;
      })
      .join('\n');

    console.log(`📋 [${requestId}] Conversation context built:`, {
      participantMessageCount: participantMessages.length,
      conversationProgress,
      contextLength: conversationContext.length,
      contextPreview: conversationContext.substring(0, 200) + '...'
    });

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
    console.log(`📝 [${requestId}] OpenAI request details:`, {
      model: 'gpt-4o-mini',
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      maxTokens: 400,
      temperature: 0.7,
      conversationProgress,
      participantMessageCount: participantMessages.length
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
        max_tokens: 400,
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
    
    if (!aiContent) {
      console.error(`❌ [${requestId}] No content received from OpenAI API:`, {
        responseData: data,
        choices: data.choices
      });
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI subsequent message generated successfully:`, {
      contentLength: aiContent.length,
      model: 'gpt-4o-mini',
      conversationProgress,
      participantMessageCount: participantMessages.length,
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title,
      duration: apiDuration,
      tokensUsed: data.usage?.total_tokens,
      contentPreview: aiContent.substring(0, 150) + '...'
    });
    
    return {
      content: aiContent,
      generationMethod: 'ai_subsequent',
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      avatar: facilitatorContext.profilePicture || '/api/avatar?name=' + encodeURIComponent(facilitatorContext.name) + '&variant=beam&palette=2'
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] AI subsequent message generation failed:`, {
      error: error.message,
      stack: error.stack,
      conversationId,
      facilitatorTitle: conversation?.sessions?.facilitator_details?.title
    });
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
