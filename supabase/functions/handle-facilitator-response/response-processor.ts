import { 
  checkAndLockGeneration, 
  unlockGeneration, 
  checkExistingMessages 
} from "./message-deduplication.ts";
import { 
  generateAIWelcomeMessage, 
  generateEnhancedTemplateMessage 
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
    hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
  });

  try {
    // Handle session start with enhanced late joiner detection
    if (sessionStart) {
      console.log(`🎯 [${requestId}] Session start detected - checking for late joiner scenario`);
      
      // Check if generation is already in progress
      if (!checkAndLockGeneration(conversationId, requestId)) {
        return {
          id: `resp-duplicate-${Date.now()}`,
          content: "Welcome message generation already in progress...",
          is_report: false,
          metrics: {
            generationMethod: 'duplicate_prevention',
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
      }

      try {
        // Check if this is a late joiner scenario
        const isLateJoiner = await checkIsLateJoiner(supabase, conversationId, requestId);
        
        if (isLateJoiner) {
          console.log(`👋 [${requestId}] Late joiner detected - generating conversation summary`);
          
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
              
              unlockGeneration(conversationId, requestId);
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
              console.error(`❌ [${requestId}] Late joiner summary failed:`, lateJoinerError);
              // Fall through to regular welcome message generation
            }
          }
        }

        // Check if messages already exist (for true session start)
        const hasExistingMessages = await checkExistingMessages(supabase, conversationId);
        if (hasExistingMessages && !isLateJoiner) {
          console.log(`📭 [${requestId}] Messages already exist for conversation ${conversationId}, skipping generation`);
          unlockGeneration(conversationId, requestId);
          return {
            id: `resp-exists-${Date.now()}`,
            content: "Welcome message already exists for this session.",
            is_report: false,
            metrics: {
              generationMethod: 'exists_check',
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
        }

        // Try AI generation first if we have rich conversation data
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
        if (openaiApiKey && conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective) {
          try {
            console.log(`🤖 [${requestId}] Attempting AI generation with rich context...`);
            const aiResponse = await generateAIWelcomeMessage(
              conversation,
              participants,
              openaiApiKey,
              requestId
            );
            
            if (aiResponse) {
              unlockGeneration(conversationId, requestId);
              return {
                id: `resp-${Date.now()}`,
                content: aiResponse.content,
                is_report: false,
                avatar: aiResponse.avatar,
                facilitator_context: aiResponse.facilitator_context,
                session_context: aiResponse.session_context,
                metrics: {
                  generationMethod: 'ai',
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
            console.error(`❌ [${requestId}] AI generation failed:`, aiError);
            // Fall through to template generation
          }
        } else {
          console.log(`⚠️ [${requestId}] Missing OpenAI key or rich context, using template generation`);
        }

        // Fall back to enhanced template generation
        console.log(`📝 [${requestId}] Using enhanced template-based response generation`);
        const templateResponse = generateEnhancedTemplateMessage(conversation, participants, requestId);
        
        unlockGeneration(conversationId, requestId);
        return {
          id: `resp-${Date.now()}`,
          content: templateResponse.content,
          is_report: false,
          avatar: templateResponse.avatar,
          facilitator_context: templateResponse.facilitator_context,
          session_context: templateResponse.session_context,
          metrics: {
            generationMethod: 'enhanced_template',
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

      } catch (error) {
        unlockGeneration(conversationId, requestId);
        throw error;
      }
    }

    // Handle other types of responses (reports, wrap-ups, etc.)
    console.log(`📝 [${requestId}] Processing non-session-start response`);
    
    return {
      id: `resp-${Date.now()}`,
      content: "Thank you for your participation. How can I help you further?",
      is_report: generateReport,
      metrics: {
        generationMethod: 'standard',
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
