import { 
  checkAndLockGeneration, 
  unlockGeneration, 
  checkExistingMessages 
} from "./message-deduplication.ts";
import { 
  generateAIWelcomeMessage, 
  generateEnhancedTemplateMessage,
  generateAISubsequentMessage,
  generateAIWelcomeMessageForSessionStart
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
    hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective),
    welcomeMessageStatus: conversation?.welcome_message_status
  });

  try {
    // Handle session start - FIXED: Generate AI welcome message directly
    if (sessionStart) {
      console.log(`🎯 [${requestId}] [AI-TRACKING] Session start detected - generating AI welcome message directly`);
      
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

      // FIXED: Generate AI welcome message directly instead of delegating
      console.log(`🤖 [${requestId}] [AI-TRACKING] Generating AI welcome message for session start`);
      console.log(`📊 [${requestId}] [AI-TRACKING] Session context for AI generation:`, {
        conversationId,
        hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective),
        facilitatorTitle: conversation?.sessions?.facilitator_details?.title,
        sessionObjective: conversation?.sessions?.objective,
        sessionTitle: conversation?.sessions?.title,
        participantDescription: conversation?.participant_description,
        language: conversation?.language,
        participantCount: participants?.length || 0,
        currentStatus: conversation?.welcome_message_status
      });
      
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      
      if (openaiApiKey && conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective) {
        try {
          console.log(`🚀 [${requestId}] [AI-TRACKING] Attempting AI welcome message generation...`);
          
          const aiWelcomeResponse = await generateAIWelcomeMessageForSessionStart(
            supabase,
            conversationId,
            conversation,
            participants,
            openaiApiKey,
            requestId
          );
          
          if (aiWelcomeResponse) {
            console.log(`✅ [${requestId}] [AI-TRACKING] AI welcome message generated and stored successfully:`, {
              contentLength: aiWelcomeResponse.content?.length || 0,
              hasAvatar: !!aiWelcomeResponse.avatar,
              messageId: aiWelcomeResponse.insertedMessage?.id,
              generationMethod: aiWelcomeResponse.generationMethod
            });
            
            return {
              id: `resp-${Date.now()}`,
              content: aiWelcomeResponse.content,
              is_report: false,
              avatar: aiWelcomeResponse.avatar,
              facilitator_context: aiWelcomeResponse.facilitator_context,
              session_context: aiWelcomeResponse.session_context,
              metrics: {
                generationMethod: 'ai_welcome_session_start',
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
          console.error(`❌ [${requestId}] [AI-TRACKING] AI welcome message generation failed:`, {
            error: aiError.message,
            stack: aiError.stack,
            conversationId,
            facilitatorTitle: conversation?.sessions?.facilitator_details?.title
          });
          
          // Update status to failed and fall through to template generation
          try {
            await supabase
              .from('conversations')
              .update({ welcome_message_status: 'failed' })
              .eq('id', conversationId);
          } catch (statusError) {
            console.error(`❌ [${requestId}] Error updating welcome message status to failed:`, statusError);
          }
        }
      } else {
        console.log(`⚠️ [${requestId}] [AI-TRACKING] Cannot use AI generation - falling back to template:`, {
          hasApiKey: !!openaiApiKey,
          hasFacilitatorTitle: !!conversation?.sessions?.facilitator_details?.title,
          hasObjective: !!conversation?.sessions?.objective,
          reason: !openaiApiKey ? 'No API key' : 
                  !conversation?.sessions?.facilitator_details?.title ? 'No facilitator title' :
                  !conversation?.sessions?.objective ? 'No objective' : 'Unknown'
        });
      }

      // Fallback to template welcome message generation
      console.log(`📝 [${requestId}] [AI-TRACKING] Generating template welcome message as fallback`);
      try {
        // Generate template message directly
        const { data: insertedMessage, error: insertError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            content: {
              text: `Welcome to ${conversation?.sessions?.title || 'this session'}! I'm ${conversation?.sessions?.facilitator_details?.title || 'your facilitator'}, and I'm excited to have you join us today.\n\nOur objective for today is: ${conversation?.sessions?.objective || 'to have a productive discussion'}.\n\nTo get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?\n\nI'm looking forward to our discussion and learning from each of your unique perspectives!`,
              avatar: conversation?.sessions?.facilitator_details?.profile_picture || `/api/avatar?name=${encodeURIComponent(conversation?.sessions?.facilitator_details?.title || 'Facilitator')}&variant=beam&palette=2`
            },
            role: 'assistant',
            name: conversation?.sessions?.facilitator_details?.title || 'Facilitator'
          })
          .select()
          .single();

        if (insertError) {
          console.error(`❌ [${requestId}] Error inserting template welcome message:`, insertError);
          throw new Error(`Failed to insert template welcome message: ${insertError.message}`);
        }

        // Update conversation status
        await supabase
          .from('conversations')
          .update({ welcome_message_status: 'template_ready' })
          .eq('id', conversationId);

        console.log(`✅ [${requestId}] [AI-TRACKING] Template welcome message generated and stored successfully:`, {
          messageId: insertedMessage?.id,
          generationMethod: 'template_fallback'
        });

        return {
          id: `resp-${Date.now()}`,
          content: insertedMessage.content.text,
          is_report: false,
          avatar: insertedMessage.content.avatar,
          metrics: {
            generationMethod: 'template_fallback_session_start',
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
      } catch (templateError) {
        console.error(`❌ [${requestId}] [AI-TRACKING] Template welcome message generation also failed:`, templateError);
        
        // Update status to failed
        try {
          await supabase
            .from('conversations')
            .update({ welcome_message_status: 'failed' })
            .eq('id', conversationId);
        } catch (statusError) {
          console.error(`❌ [${requestId}] Error updating welcome message status to failed:`, statusError);
        }
        
        throw templateError;
      }
    }

    // Handle subsequent message generation (enhanced logic remains the same)
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
