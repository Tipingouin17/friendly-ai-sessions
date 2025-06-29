
import { 
  analyzeParticipation, 
  extractUserTopics 
} from "../_shared/message-analysis.ts";
import { 
  determineSessionProgress, 
  getFacilitatorAvatar,
  getLanguageCode 
} from "../_shared/context-analyzer.ts";
import { FACILITATION_STRATEGIES } from "../_shared/facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "../_shared/report-templates.ts";
import { 
  pruneMessagesToFitContext,
  MAX_TOKEN_ESTIMATE
} from "../_shared/context-management.ts";
import { createResponseMetrics, trackSessionMetrics } from "./metrics-handler.ts";
import { 
  extractFacilitatorContext, 
  extractSessionContext, 
  FacilitatorContext,
  SessionContext
} from "./enhanced-context-extractor.ts";

// Import enhanced AI pipeline components
import { 
  callOpenAIWithRetry, 
  validateOpenAIConfig, 
  AIGenerationResult 
} from "./ai-pipeline-handler.ts";
import { 
  generateContextAwareFallback,
  FallbackGenerationResult 
} from "./enhanced-fallback-generator.ts";
import { 
  createEnhancedSystemPrompt,
  createEnhancedPromptContent,
  validateWelcomeMessageQuality,
  EnhancedPromptConfig
} from "./welcome-message-enhancer.ts";

/**
 * Enhanced response processor with improved AI pipeline and context-aware fallbacks
 */
export async function processResponse(
  supabase: any,
  messages: any[],
  conversationId: number,
  conversation: any,
  participants: any[],
  generateReport: boolean,
  wrapUpSession?: boolean,
  sessionStart?: boolean,
  aggregateResponses?: boolean,
  responseContext?: any,
  sessionContext?: any
) {
  const processingStart = performance.now();
  const requestId = `proc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  console.log(`🚀 [${requestId}] Enhanced response processing started:`, {
    conversationId,
    sessionStart,
    wrapUpSession,
    aggregateResponses,
    generateReport,
    messageCount: messages.length,
    participantCount: participants?.length || 0
  });

  // Extract enhanced context
  const facilitatorContext = extractFacilitatorContext(conversation);
  const sessionContextData = extractSessionContext(conversation, participants);

  console.log(`📋 [${requestId}] Context extracted:`, {
    facilitatorName: facilitatorContext.name,
    facilitatorDetails: facilitatorContext.details.substring(0, 100) + '...',
    sessionTitle: sessionContextData.title,
    sessionObjective: sessionContextData.objective.substring(0, 100) + '...',
    participantDescription: sessionContextData.participantDescription,
    participantCount: sessionContextData.participantCount
  });

  // Track participation metrics
  const participantStats = analyzeParticipation(messages, participants || []);
  
  // Determine session progress
  let sessionProgress = determineSessionProgress(messages, conversation?.sessions?.duration_minutes);
  if (wrapUpSession) {
    console.log(`🔄 [${requestId}] Admin triggered wrap up - forcing session progress to 'concluding'`);
    sessionProgress = "concluding";
  }
  
  if (sessionStart) {
    console.log(`🚀 [${requestId}] Session start detected - generating enhanced welcome message`);
    sessionProgress = "early";
  }

  if (aggregateResponses) {
    console.log(`🔄 [${requestId}] Aggregating participant responses for synthesis`);
    sessionProgress = "active";
  }
  
  // Get facilitator avatar
  let facilitatorAvatar = getFacilitatorAvatar(conversation);
  if (facilitatorAvatar && typeof facilitatorAvatar === 'string') {
    facilitatorAvatar = facilitatorAvatar.replace(/([^:])\/\//g, '$1/');
    if (!facilitatorAvatar.includes('crossorigin=anonymous') && 
        (facilitatorAvatar.startsWith('http') || facilitatorAvatar.includes('supabase.co'))) {
      facilitatorAvatar += (facilitatorAvatar.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
    }
  }
  
  // Initialize response variables
  let responseContent = "";
  let responseMetrics = createResponseMetrics('template', 0, participantStats.participationBalance);
  let aiGenerationResult: AIGenerationResult | null = null;
  let fallbackResult: FallbackGenerationResult | null = null;
  
  // Validate OpenAI configuration first
  const apiValidation = validateOpenAIConfig();
  console.log(`🔑 [${requestId}] OpenAI configuration status:`, apiValidation);
  
  // Try AI generation if configuration is valid
  if (apiValidation.isValid && conversation?.sessions) {
    try {
      console.log(`🤖 [${requestId}] Attempting AI generation with enhanced context`);
      const aiStart = performance.now();
      
      // Create enhanced prompt configuration
      const promptConfig: EnhancedPromptConfig = {
        facilitatorContext,
        sessionContext: sessionContextData,
        isSessionStart: sessionStart || false,
        participantCount: sessionContextData.participantCount
      };
      
      // Generate enhanced system prompt
      const systemPrompt = createEnhancedSystemPrompt(promptConfig);
      
      // Create enhanced prompt content
      const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE);
      const promptContent = createEnhancedPromptContent(promptConfig, prunedMessages);
      
      console.log(`📝 [${requestId}] Enhanced prompts created:`, {
        systemPromptLength: systemPrompt.length,
        promptContentLength: promptContent.length,
        facilitatorName: facilitatorContext.name,
        sessionObjective: sessionContextData.objective.substring(0, 50) + '...'
      });
      
      // Call OpenAI with enhanced retry logic
      aiGenerationResult = await callOpenAIWithRetry(
        systemPrompt,
        promptContent,
        generateReport
      );
      
      const aiDuration = performance.now() - aiStart;
      
      if (aiGenerationResult.success) {
        responseContent = aiGenerationResult.content;
        console.log(`✅ [${requestId}] AI generation successful:`, {
          contentLength: responseContent.length,
          duration: aiDuration.toFixed(2) + 'ms',
          attempt: aiGenerationResult.attempt
        });
        
        // Validate quality for welcome messages
        if (sessionStart) {
          const qualityCheck = validateWelcomeMessageQuality(
            responseContent,
            facilitatorContext,
            sessionContextData
          );
          
          console.log(`🎯 [${requestId}] Welcome message quality check:`, {
            score: qualityCheck.score,
            isValid: qualityCheck.isValid,
            missingElements: qualityCheck.missingElements
          });
          
          if (!qualityCheck.isValid) {
            console.warn(`⚠️ [${requestId}] AI-generated welcome message quality too low, using enhanced fallback`);
            aiGenerationResult.success = false;
            aiGenerationResult.fallbackReason = 'quality_check_failed';
          }
        }
        
        if (aiGenerationResult.success) {
          responseMetrics = createResponseMetrics('ai', aiDuration, participantStats.participationBalance);
        }
      } else {
        console.error(`❌ [${requestId}] AI generation failed:`, {
          error: aiGenerationResult.error,
          fallbackReason: aiGenerationResult.fallbackReason,
          attempt: aiGenerationResult.attempt,
          duration: aiDuration.toFixed(2) + 'ms'
        });
      }
    } catch (error) {
      console.error(`💥 [${requestId}] AI generation error:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  } else {
    console.log(`🚫 [${requestId}] Skipping AI generation:`, {
      configValid: apiValidation.isValid,
      hasSession: !!conversation?.sessions,
      reason: !apiValidation.isValid ? apiValidation.error : 'No session configuration'
    });
  }
  
  // Use enhanced fallback if AI generation failed
  if (!aiGenerationResult?.success) {
    console.log(`🎯 [${requestId}] Generating enhanced context-aware fallback`);
    const fallbackStart = performance.now();
    
    fallbackResult = generateContextAwareFallback(
      facilitatorContext,
      sessionContextData,
      sessionProgress,
      sessionStart || false
    );
    
    responseContent = fallbackResult.content;
    const fallbackDuration = performance.now() - fallbackStart;
    
    console.log(`✅ [${requestId}] Enhanced fallback generated:`, {
      fallbackType: fallbackResult.fallbackType,
      contentLength: responseContent.length,
      duration: fallbackDuration.toFixed(2) + 'ms',
      contextUsed: fallbackResult.contextUsed
    });
    
    responseMetrics = createResponseMetrics('enhanced_fallback', fallbackDuration, participantStats.participationBalance);
  }
  
  // Track session metrics with enhanced context
  const extractedTopics = extractUserTopics(messages);
  
  try {
    await trackSessionMetrics(
      supabase,
      conversationId,
      responseMetrics,
      responseContent,
      extractedTopics,
      participantStats,
      sessionContextData.participantCount,
      sessionContextData.participantDescription,
      sessionContextData.language,
      sessionStart ? 'session_start' : 
      (aggregateResponses ? 'response_aggregation' : 
      (wrapUpSession ? 'session_wrap_up' : 
      (generateReport ? 'report_generation' : 'facilitator_response'))),
      facilitatorContext,
      sessionContextData.objective
    );
  } catch (error) {
    console.error(`⚠️ [${requestId}] Error tracking metrics:`, error);
  }
  
  // Create enhanced response object
  const totalDuration = performance.now() - processingStart;
  const result = {
    id: requestId,
    content: responseContent,
    is_report: generateReport,
    metrics: {
      ...responseMetrics,
      ai_generation_success: aiGenerationResult?.success || false,
      ai_generation_error: aiGenerationResult?.error || null,
      fallback_type: fallbackResult?.fallbackType || null,
      fallback_context_used: fallbackResult?.contextUsed || null,
      quality_validation_passed: sessionStart ? 
        validateWelcomeMessageQuality(responseContent, facilitatorContext, sessionContextData).isValid : 
        true
    },
    avatar: facilitatorAvatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
    facilitator_context: facilitatorContext,
    session_context: sessionContextData
  };

  console.log(`🎉 [${requestId}] Enhanced response processing complete:`, {
    totalDuration: totalDuration.toFixed(2) + 'ms',
    contentLength: responseContent.length,
    generationMethod: aiGenerationResult?.success ? 'ai' : 'enhanced_fallback',
    facilitatorName: facilitatorContext.name,
    sessionObjective: sessionContextData.objective.substring(0, 50) + '...',
    qualityScore: sessionStart ? 
      validateWelcomeMessageQuality(responseContent, facilitatorContext, sessionContextData).score : 
      'N/A'
  });

  return result;
}
