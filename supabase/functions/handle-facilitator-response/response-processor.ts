
import { 
  checkAndLockGeneration, 
  unlockGeneration, 
  checkExistingMessages 
} from "./message-deduplication.ts";
import { 
  generateAIWelcomeMessage, 
  generateEnhancedTemplateMessage,
  generateAISubsequentMessage
} from "./ai-generation.ts";
import { 
  generateLateJoinerSummary,
  checkIsLateJoiner 
} from "./late-joiner-handler.ts";

export async function processResponse(
  supabase: any,
  messages: any[],
  conversationId: number,
  conversation: any,
  participants: any[],
  generateReport: boolean,
  wrapUpSession: boolean,
  sessionStart: boolean
) {
  const requestId = `proc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🚀 [${requestId}] Starting enhanced response processing for conversation: ${conversationId}`, {
    sessionStart,
    wrapUpSession,
    generateReport,
    hasConversationData: !!conversation,
    participantCount: participants?.length || 0,
    messageCount: messages?.length || 0,
    hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
  });

  try {
    // Handle session start - database trigger handles welcome message generation
    if (sessionStart) {
      console.log(`🎯 [${requestId}] [AI-TRACKING] Session start detected - database trigger handles welcome message generation`);
      
      // Check if this is a late joiner scenario
      const isLateJoiner = await checkIsLateJoiner(supabase, conversationId, requestId);
      
      if (isLateJoiner) {
        console.log(`👋 [${requestId}] [AI-TRACKING] Late joiner detected - generating conversation summary`);
        
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiApiKey) {
          try {
            const lateJoinerResponse = await generateLateJoinerSummary(
              supabase,
              conversationId,
              conversation,
              participants,
              openaiApiKey,
              requestId
            );
            
            console.log(`✅ [${requestId}] [AI-TRACKING] Late joiner summary generated successfully:`, {
              contentLength: lateJoinerResponse.content?.length || 0,
              generationMethod: lateJoinerResponse.generationMethod,
              hasAvatar: !!lateJoinerResponse.avatar
            });
            
            return {
              id: `resp-${Date.now()}`,
              content: lateJoinerResponse.content,
              is_report: false,
              avatar: lateJoinerResponse.avatar,
              facilitator_context: lateJoinerResponse.facilitator_context,
              session_context: lateJoinerResponse.session_context,
              metrics: {
                generationMethod: lateJoinerResponse.generationMethod,
                generationTime: 0,
                responseQuality: 'high',
                topicRelevance: 'high',
                participationBalance: 0,
                timestamp: Date.now(),
                isOptimal: true,
                qualityScore: 0.9,
                reliabilityScore: 1,
                speedClass: 'medium',
                methodEfficiency: 1
              }
            };
          } catch (lateJoinerError) {
            console.error(`❌ [${requestId}] [AI-TRACKING] Late joiner summary failed:`, lateJoinerError);
          }
        } else {
          console.warn(`⚠️ [${requestId}] [AI-TRACKING] No OpenAI API key available for late joiner summary`);
        }
      }

      // For session start, trigger AI welcome message generation via edge function
      console.log(`🎯 [${requestId}] [AI-TRACKING] Triggering AI welcome message generation for session start`);
      console.log(`📊 [${requestId}] [AI-TRACKING] Session context for AI generation:`, {
        conversationId,
        hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective),
        facilitatorTitle: conversation?.sessions?.facilitator_details?.title,
        sessionObjective: conversation?.sessions?.objective,
        sessionTitle: conversation?.sessions?.title,
        participantDescription: conversation?.participant_description,
        language: conversation?.language,
        participantCount: participants?.length || 0
      });
      
      // Call the AI welcome message generation edge function
      try {
        const welcomeResponse = await supabase.functions.invoke('generate-ai-welcome', {
          body: { conversationId }
        });
        
        if (welcomeResponse.error) {
          console.error(`❌ [${requestId}] AI welcome generation failed:`, welcomeResponse.error);
        } else {
          console.log(`✅ [${requestId}] AI welcome generation triggered successfully:`, welcomeResponse.data);
        }
      } catch (welcomeError) {
        console.error(`❌ [${requestId}] Error calling AI welcome generation:`, welcomeError);
      }
      
      return {
        id: `resp-${Date.now()}`,
        content: "Session started - AI welcome message generation initiated",
        is_report: false,
        metrics: {
          generationMethod: 'ai_welcome_trigger',
          generationTime: 0,
          responseQuality: 'high',
          topicRelevance: 'high',
          participationBalance: 0,
          timestamp: Date.now(),
          isOptimal: true,
          qualityScore: 0.9,
          reliabilityScore: 1,
          speedClass: 'fast',
          methodEfficiency: 1
        }
      };
    }

    // Handle subsequent message generation (NEW ENHANCED LOGIC)
    if (!generateReport && !wrapUpSession && !sessionStart) {
      console.log(`💬 [${requestId}] [AI-TRACKING] Processing subsequent message generation`);
      
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      console.log(`🔑 [${requestId}] [AI-TRACKING] OpenAI API key available:`, !!openaiApiKey);
      console.log(`📋 [${requestId}] [AI-TRACKING] Rich context check:`, {
        hasFacilitatorTitle: !!conversation?.sessions?.facilitator_details?.title,
        hasObjective: !!conversation?.sessions?.objective,
        facilitatorTitle: conversation?.sessions?.facilitator_details?.title,
        objectiveLength: conversation?.sessions?.objective?.length || 0
      });
      
      if (openaiApiKey && conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective) {
        try {
          console.log(`🤖 [${requestId}] [AI-TRACKING] Attempting AI generation for subsequent message...`);
          const aiResponse = await generateAISubsequentMessage(
            supabase,
            conversationId,
            conversation,
            participants,
            messages,
            openaiApiKey,
            requestId
          );
          
          if (aiResponse) {
            console.log(`✅ [${requestId}] [AI-TRACKING] AI subsequent message generated successfully:`, {
              contentLength: aiResponse.content?.length || 0,
              hasAvatar: !!aiResponse.avatar,
              hasFacilitatorContext: !!aiResponse.facilitator_context,
              hasSessionContext: !!aiResponse.session_context
            });
            return {
              id: `resp-${Date.now()}`,
              content: aiResponse.content,
              is_report: false,
              avatar: aiResponse.avatar,
              facilitator_context: aiResponse.facilitator_context,
              session_context: aiResponse.session_context,
              metrics: {
                generationMethod: 'ai_subsequent',
                generationTime: 0,
                responseQuality: 'high',
                topicRelevance: 'high',
                participationBalance: 0,
                timestamp: Date.now(),
                isOptimal: true,
                qualityScore: 0.9,
                reliabilityScore: 1,
                speedClass: 'medium',
                methodEfficiency: 1
              }
            };
          }
        } catch (aiError) {
          console.error(`❌ [${requestId}] [AI-TRACKING] AI subsequent message generation failed:`, {
            error: aiError.message,
            stack: aiError.stack,
            conversationId,
            facilitatorTitle: conversation?.sessions?.facilitator_details?.title
          });
          // Fall through to enhanced template
        }
      } else {
        console.log(`⚠️ [${requestId}] [AI-TRACKING] Cannot use AI generation:`, {
          hasApiKey: !!openaiApiKey,
          hasFacilitatorTitle: !!conversation?.sessions?.facilitator_details?.title,
          hasObjective: !!conversation?.sessions?.objective,
          reason: !openaiApiKey ? 'No API key' : 
                  !conversation?.sessions?.facilitator_details?.title ? 'No facilitator title' :
                  !conversation?.sessions?.objective ? 'No objective' : 'Unknown'
        });
      }

      // Fall back to enhanced template for subsequent messages
      console.log(`📝 [${requestId}] [AI-TRACKING] Using enhanced template for subsequent message`);
      const templateResponse = generateEnhancedTemplateMessage(conversation, participants, requestId);
      
      return {
        id: `resp-${Date.now()}`,
        content: templateResponse.content,
        is_report: false,
        avatar: templateResponse.avatar,
        facilitator_context: templateResponse.facilitator_context,
        session_context: templateResponse.session_context,
        metrics: {
          generationMethod: 'enhanced_template_subsequent',
          generationTime: 0,
          responseQuality: 'medium',
          topicRelevance: 'medium',
          participationBalance: 0,
          timestamp: Date.now(),
          isOptimal: false,
          qualityScore: 0.7,
          reliabilityScore: 1,
          speedClass: 'fast',
          methodEfficiency: 0.8
        }
      };
    }

    // Handle report generation
    if (generateReport) {
      console.log(`📊 [${requestId}] Processing report generation`);
      
      return {
        id: `resp-${Date.now()}`,
        content: "Session report has been generated. Thank you for your participation in this productive discussion.",
        is_report: true,
        metrics: {
          generationMethod: 'report',
          generationTime: 0,
          responseQuality: 'high',
          topicRelevance: 'high',
          participationBalance: 0,
          timestamp: Date.now(),
          isOptimal: true,
          qualityScore: 0.8,
          reliabilityScore: 1,
          speedClass: 'fast',
          methodEfficiency: 1
        }
      };
    }

    // Handle session wrap-up
    if (wrapUpSession) {
      console.log(`🎯 [${requestId}] Processing session wrap-up`);
      
      return {
        id: `resp-${Date.now()}`,
        content: "Thank you all for your valuable contributions to this session. We've covered a lot of ground together, and I hope you found the discussion insightful and productive.",
        is_report: false,
        metrics: {
          generationMethod: 'wrap_up',
          generationTime: 0,
          responseQuality: 'medium',
          topicRelevance: 'medium',
          participationBalance: 0,
          timestamp: Date.now(),
          isOptimal: false,
          qualityScore: 0.7,
          reliabilityScore: 1,
          speedClass: 'fast',
          methodEfficiency: 0
        }
      };
    }

    // Fallback for any other scenarios
    console.log(`🔄 [${requestId}] Using fallback response`);
    return {
      id: `resp-${Date.now()}`,
      content: "I'm here to facilitate our discussion. Please share your thoughts and insights.",
      is_report: false,
      metrics: {
        generationMethod: 'fallback',
        generationTime: 0,
        responseQuality: 'medium',
        topicRelevance: 'medium',
        participationBalance: 0,
        timestamp: Date.now(),
        isOptimal: false,
        qualityScore: 0.6,
        reliabilityScore: 1,
        speedClass: 'fast',
        methodEfficiency: 0
      }
    };

  } catch (error) {
    console.error(`💥 [${requestId}] Error in response processing:`, error);
    throw error;
  }
}
