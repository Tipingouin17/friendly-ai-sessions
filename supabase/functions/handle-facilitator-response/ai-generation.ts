
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
  
  try {
    // Extract enhanced context
    const facilitatorContext = extractFacilitatorContext(conversation);
    const sessionContext = extractSessionContext(conversation, participants);
    
    console.log(`📋 [${requestId}] AI generation context:`, {
      facilitatorName: facilitatorContext.name,
      sessionTitle: sessionContext.title,
      participantCount: sessionContext.participantCount,
      hasSessionData: !!conversation?.sessions
    });
    
    // Create contextual system prompt
    const systemPrompt = createContextualSystemPrompt(
      facilitatorContext,
      sessionContext,
      'early',
      true // isSessionStart
    );
    
    const userPrompt = `Generate a warm, engaging welcome message for this ${sessionContext.sessionType} session. The session just started automatically when we reached ${sessionContext.participantCount} ${sessionContext.participantDescription}. Make it personal and set the tone for productive collaboration.`;
    
    console.log(`🚀 [${requestId}] Calling OpenAI API for AI generation...`);
    
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

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from OpenAI API');
    }
    
    console.log(`✅ [${requestId}] AI welcome message generated successfully:`, {
      contentLength: aiContent.length,
      model: 'gpt-4o-mini'
    });
    
    return {
      content: aiContent,
      generationMethod: 'ai',
      facilitator_context: facilitatorContext,
      session_context: sessionContext,
      avatar: facilitatorContext.profilePicture || '/api/avatar?name=' + encodeURIComponent(facilitatorContext.name) + '&variant=beam&palette=2'
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] AI generation failed:`, error);
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
