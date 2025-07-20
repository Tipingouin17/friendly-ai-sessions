
/**
 * AI Generation utilities with comprehensive context support
 */

import { 
  extractFacilitatorContext, 
  extractSessionContext, 
  createContextualSystemPrompt,
  analyzeConversationThemes,
  assessParticipationBalance
} from './enhanced-context-extractor.ts';

export async function generateAIWelcomeMessage(
  conversation: any,
  participants: any[],
  openaiApiKey: string
): Promise<any> {
  const requestId = `welcome-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🎯 [${requestId}] Starting comprehensive AI welcome message generation`);
  
  // Extract comprehensive context
  const facilitatorContext = extractFacilitatorContext(conversation);
  const sessionContext = extractSessionContext(conversation, participants);
  
  console.log(`📋 [${requestId}] Comprehensive context extracted:`, {
    facilitator: facilitatorContext.name,
    sessionTitle: sessionContext.title,
    language: sessionContext.language,
    participantType: sessionContext.participantDescription,
    sessionType: sessionContext.sessionType,
    hasLanguageInstruction: !!sessionContext.language && sessionContext.language !== 'en'
  });
  
  // Create comprehensive system prompt with full context
  const systemPrompt = createContextualSystemPrompt(
    facilitatorContext,
    sessionContext,
    'early',
    true // isSessionStart
  );
  
  const userPrompt = sessionContext.language === 'fr' ?
    `Bienvenue dans cette session "${sessionContext.title}". En tant que ${facilitatorContext.name}, créez un message d'accueil chaleureux et professionnel qui établit le ton pour cette session avec ${sessionContext.participantDescription}. Présentez-vous, expliquez l'objectif, et encouragez la participation active. Adaptez votre message à votre expertise et au contexte des participants.` :
    `Welcome to this "${sessionContext.title}" session. As ${facilitatorContext.name}, create a warm and professional welcome message that sets the tone for this session with ${sessionContext.participantDescription}. Introduce yourself, explain the objective, and encourage active participation. Tailor your message to your expertise and participant context.`;

  console.log(`📝 [${requestId}] AI request details:`, {
    model: 'gpt-4o-mini',
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    language: sessionContext.language,
    maxTokens: 600,
    temperature: 0.7
  });

  try {
    const startTime = performance.now();
    
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
        max_tokens: 600,
        temperature: 0.7,
      }),
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ [${requestId}] OpenAI API call completed in ${duration.toFixed(0)}ms with status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI welcome message generated successfully:`, {
      contentLength: content.length,
      tokensUsed,
      language: sessionContext.language,
      duration: duration.toFixed(0),
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title,
      contentPreview: content.substring(0, 100) + '...'
    });
    
    return {
      id: `welcome-${Date.now()}`,
      content,
      role: 'assistant',
      name: facilitatorContext.name,
      created_at: new Date().toISOString(),
      likes: [],
      isReport: false,
      isAnonymous: false,
      avatar: facilitatorContext.profilePicture || `/api/avatar?name=${encodeURIComponent(facilitatorContext.name)}&variant=beam&palette=2`,
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      metrics: {
        generationMethod: 'ai_welcome_comprehensive',
        generationTime: duration,
        responseQuality: 'high',
        topicRelevance: 'high',
        participationBalance: 0,
        timestamp: Date.now(),
        isOptimal: true,
        qualityScore: 0.95,
        reliabilityScore: 1,
        speedClass: duration < 2000 ? 'fast' : duration < 5000 ? 'medium' : 'slow',
        methodEfficiency: 1,
        tokensUsed,
        language: sessionContext.language,
        contextQuality: 'comprehensive'
      }
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating AI welcome message:`, error);
    throw error;
  }
}

export async function generateAISubsequentMessage(
  messages: any[],
  conversation: any,
  participants: any[],
  openaiApiKey: string
): Promise<any> {
  const requestId = `subseq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🤖 [${requestId}] Starting comprehensive AI subsequent message generation`);
  
  // Extract comprehensive context
  const facilitatorContext = extractFacilitatorContext(conversation);
  const sessionContext = extractSessionContext(conversation, participants);
  
  // Analyze conversation progress
  const participantMessages = messages.filter(msg => msg.role === 'user');
  const conversationProgress = participantMessages.length <= 2 ? 'early' : 
                             participantMessages.length <= 6 ? 'middle' : 'concluding';
  
  // Analyze themes and participation
  const themes = analyzeConversationThemes(messages);
  const participationAnalysis = assessParticipationBalance(messages, sessionContext.participantCount);
  
  console.log(`📋 [${requestId}] Comprehensive analysis:`, {
    facilitator: facilitatorContext.name,
    language: sessionContext.language,
    conversationProgress,
    participantMessageCount: participantMessages.length,
    themes: themes.slice(0, 3),
    participationBalance: participationAnalysis.participationBalance,
    contextQuality: 'comprehensive'
  });
  
  // Create comprehensive system prompt
  const systemPrompt = createContextualSystemPrompt(
    facilitatorContext,
    sessionContext,
    conversationProgress,
    false
  );
  
  // Build context from recent messages
  const recentMessages = messages.slice(-4); // Last 4 messages for context
  const conversationContext = recentMessages.map(msg => {
    if (msg.role === 'user') {
      const participant = msg.participant || 'Participant';
      const content = typeof msg.content === 'string' ? msg.content : 
                     (typeof msg.content === 'object' && msg.content?.text) ? msg.content.text : '';
      return `${participant}: ${content}`;
    } else {
      return `Facilitator: ${typeof msg.content === 'string' ? msg.content : msg.content?.text || ''}`;
    }
  }).join('\n');
  
  const userPrompt = sessionContext.language === 'fr' ?
    `En tant que ${facilitatorContext.name}, répondez de manière appropriée à cette conversation avec ${sessionContext.participantDescription}. 

Contexte de la conversation récente:
${conversationContext}

Thèmes émergents: ${themes.join(', ')}
Progression: ${conversationProgress}
Balance de participation: ${participationAnalysis.participationBalance}

Fournissez une réponse engageante qui fait avancer la discussion vers l'objectif de la session: ${sessionContext.objective}` :
    `As ${facilitatorContext.name}, respond appropriately to this conversation with ${sessionContext.participantDescription}.

Recent conversation context:
${conversationContext}

Emerging themes: ${themes.join(', ')}
Progress: ${conversationProgress}
Participation balance: ${participationAnalysis.participationBalance}

Provide an engaging response that advances the discussion toward the session objective: ${sessionContext.objective}`;

  console.log(`📝 [${requestId}] AI request details:`, {
    model: 'gpt-4o-mini',
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    language: sessionContext.language,
    maxTokens: 400,
    temperature: 0.7,
    conversationProgress,
    participantMessageCount: participantMessages.length
  });

  try {
    const startTime = performance.now();
    
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
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`⏱️ [${requestId}] OpenAI API call completed in ${duration.toFixed(0)}ms with status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const tokensUsed = data.usage?.total_tokens || 0;
    
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI subsequent message generated successfully:`, {
      contentLength: content.length,
      tokensUsed,
      language: sessionContext.language,
      model: 'gpt-4o-mini',
      conversationProgress,
      participantMessageCount: participantMessages.length,
      facilitatorUsed: facilitatorContext.name,
      sessionUsed: sessionContext.title,
      duration: duration.toFixed(0),
      contentPreview: content.substring(0, 100) + '...'
    });
    
    return {
      id: `resp-${Date.now()}`,
      content,
      role: 'assistant',
      name: facilitatorContext.name,
      created_at: new Date().toISOString(),
      likes: [],
      isReport: false,
      isAnonymous: false,
      avatar: facilitatorContext.profilePicture || `/api/avatar?name=${encodeURIComponent(facilitatorContext.name)}&variant=beam&palette=2`,
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      metrics: {
        generationMethod: 'ai_subsequent_comprehensive',
        generationTime: duration,
        responseQuality: 'high',
        topicRelevance: 'high',
        participationBalance: participationAnalysis.participationBalance === 'balanced' ? 1 : 0,
        timestamp: Date.now(),
        isOptimal: true,
        qualityScore: 0.9,
        reliabilityScore: 1,
        speedClass: duration < 2000 ? 'fast' : duration < 5000 ? 'medium' : 'slow',
        methodEfficiency: 1,
        tokensUsed,
        language: sessionContext.language,
        conversationProgress,
        contextQuality: 'comprehensive',
        themesAnalyzed: themes.length
      }
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error generating AI subsequent message:`, error);
    throw error;
  }
}
