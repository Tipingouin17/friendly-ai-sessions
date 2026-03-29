
/**
 * Enhanced response processing with comprehensive context support
 */

import { generateAIWelcomeMessage, generateAISubsequentMessage } from './ai-generation.ts';

export async function processResponse(
  supabase: any,
  messages: any[],
  conversationId: number,
  conversation: any,
  participants: any[],
  generateReport: boolean = false,
  wrapUpSession: boolean = false,
  sessionStart: boolean = false
): Promise<any> {
  const processingId = `proc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🚀 [${processingId}] Starting enhanced response processing for conversation: ${conversationId} {
  sessionStart: ${sessionStart},
  wrapUpSession: ${wrapUpSession},
  generateReport: ${generateReport},
  hasConversationData: ${!!conversation},
  participantCount: ${participants?.length || 0},
  messageCount: ${messages?.length || 0},
  hasRichContext: ${!!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)},
  welcomeMessageStatus: ${conversation?.welcome_message_status},
  language: ${conversation?.language || 'en'}
}`);

  // Get OpenAI API key
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  console.log(`🔑 [${processingId}] [AI-TRACKING] OpenAI API key available: ${!!openaiApiKey}`);
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not found');
  }

  try {
    let responseObject: any;

    if (sessionStart) {
      console.log(`🎯 [${processingId}] [AI-TRACKING] Processing session start with comprehensive context`);
      console.log(`📋 [${processingId}] [AI-TRACKING] Rich context check: {
  hasFacilitatorTitle: ${!!conversation?.sessions?.facilitator_details?.title},
  hasObjective: ${!!conversation?.sessions?.objective},
  facilitatorTitle: "${conversation?.sessions?.facilitator_details?.title}",
  objectiveLength: ${conversation?.sessions?.objective?.length || 0},
  language: "${conversation?.language || 'en'}",
  participantDescription: "${conversation?.participant_description || 'participants'}"
}`);

      console.log(`🎯 [${processingId}] Starting comprehensive AI welcome generation`);
      responseObject = await generateAIWelcomeMessage(conversation, participants, openaiApiKey);
      
      // Save welcome message to database
      const facilitatorId = conversation?.sessions?.facilitator_details?.id
        || conversation?.sessions?.facilitator
        || null;
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          facilitator_id: facilitatorId,
          content: {
            text: responseObject.content,
            avatar: responseObject.avatar,
            facilitator_context: responseObject.facilitator_context,
            session_context: responseObject.session_context
          },
          role: 'assistant',
          name: responseObject.name
        })
        .select()
        .single();

      if (messageError) {
        console.error(`❌ [${processingId}] Error saving welcome message:`, messageError);
        throw messageError;
      }

      // Update conversation status
      await supabase
        .from('conversations')
        .update({ welcome_message_status: 'ai_ready' })
        .eq('id', conversationId);

      console.log(`✅ [${processingId}] [AI-TRACKING] AI welcome message generated and saved successfully: {
  contentLength: ${responseObject.content.length},
  hasAvatar: ${!!responseObject.avatar},
  hasFacilitatorContext: ${!!responseObject.facilitator_context},
  hasSessionContext: ${!!responseObject.session_context},
  language: ${responseObject.session_context?.language || 'en'}
}`);

    } else if (generateReport) {
      console.log(`📊 [${processingId}] [AI-TRACKING] Processing report generation request`);
      
      // Report generation logic would go here
      responseObject = {
        id: `report-${Date.now()}`,
        content: 'Report generation functionality will be implemented here.',
        role: 'assistant',
        isReport: true,
        created_at: new Date().toISOString(),
        metrics: {
          generationMethod: 'report_generation',
          timestamp: Date.now()
        }
      };
      
    } else {
      console.log(`💬 [${processingId}] [AI-TRACKING] Processing subsequent message generation with comprehensive context`);
      console.log(`📋 [${processingId}] [AI-TRACKING] Rich context check: {
  hasFacilitatorTitle: ${!!conversation?.sessions?.facilitator_details?.title},
  hasObjective: ${!!conversation?.sessions?.objective},
  facilitatorTitle: "${conversation?.sessions?.facilitator_details?.title}",
  objectiveLength: ${conversation?.sessions?.objective?.length || 0},
  language: "${conversation?.language || 'en'}",
  participantDescription: "${conversation?.participant_description || 'participants'}"
}`);

      console.log(`🤖 [${processingId}] Starting comprehensive AI subsequent message generation`);
      console.log(`🤖 [${processingId}] [AI-TRACKING] Attempting AI generation for subsequent message with full context...`);
      
      responseObject = await generateAISubsequentMessage(messages, conversation, participants, openaiApiKey);
      
      // Save subsequent message to database
      const facilitatorIdSubseq = conversation?.sessions?.facilitator_details?.id
        || conversation?.sessions?.facilitator
        || null;
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          facilitator_id: facilitatorIdSubseq,
          content: {
            text: responseObject.content,
            avatar: responseObject.avatar,
            facilitator_context: responseObject.facilitator_context,
            session_context: responseObject.session_context
          },
          role: 'assistant',
          name: responseObject.name
        })
        .select()
        .single();

      if (messageError) {
        console.error(`❌ [${processingId}] Error saving subsequent message:`, messageError);
        throw messageError;
      }

      console.log(`✅ [${processingId}] AI subsequent message generated successfully: {
  contentLength: ${responseObject.content.length},
  model: "${responseObject.metrics?.model || 'gpt-4o-mini'}",
  conversationProgress: "${responseObject.metrics?.conversationProgress || 'unknown'}",
  participantMessageCount: ${responseObject.metrics?.participantMessageCount || 0},
  facilitatorUsed: "${responseObject.facilitator_context?.name || 'Unknown'}",
  sessionUsed: "${responseObject.session_context?.title || 'Unknown'}",
  duration: ${responseObject.metrics?.generationTime || 0},
  tokensUsed: ${responseObject.metrics?.tokensUsed || 0},
  language: "${responseObject.session_context?.language || 'en'}",
  contentPreview: "${responseObject.content.substring(0, 100)}..."
}`);

      console.log(`✅ [${processingId}] [AI-TRACKING] AI subsequent message generated successfully: {
  contentLength: ${responseObject.content.length},
  hasAvatar: ${!!responseObject.avatar},
  hasFacilitatorContext: ${!!responseObject.facilitator_context},
  hasSessionContext: ${!!responseObject.session_context},
  language: ${responseObject.session_context?.language || 'en'}
}`);
    }

    return responseObject;

  } catch (error) {
    console.error(`❌ [${processingId}] Error in enhanced response processing:`, error);
    throw error;
  }
}
