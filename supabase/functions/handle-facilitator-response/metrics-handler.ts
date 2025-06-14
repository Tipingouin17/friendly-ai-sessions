
/**
 * Track and store session metrics in the database
 */
export async function trackSessionMetrics(
  supabase: any,
  conversationId: number,
  responseMetrics: any,
  responseContent: string,
  userTopics: string[],
  participantStats: any,
  participantCount: number,
  participantDescription: string,
  language: string,
  eventType: 'report_generation' | 'facilitator_response' | 'session_wrap_up'
) {
  try {
    // Enhanced metrics tracking with more detailed information
    const enhancedMetrics = {
      ...responseMetrics,
      contentLength: responseContent.length,
      topics: userTopics,
      participationStats: participantStats,
      participantCount,
      participantDescription,
      language,
      
      // Additional performance metrics
      timestamp: new Date().toISOString(),
      wordCount: responseContent.split(/\s+/).length,
      topicCount: userTopics.length,
      averageParticipationScore: participantStats.participationBalance || 0,
      
      // Quality indicators
      hasTopics: userTopics.length > 0,
      hasParticipantData: participantCount > 0,
      responseComplexity: responseContent.length > 100 ? 'detailed' : 'brief',
      
      // Session context
      sessionPhase: eventType === 'session_wrap_up' ? 'concluding' : 'active',
      multilingualSession: language !== 'en'
    };

    await supabase.from('session_events').insert({
      conversation_id: conversationId,
      event_type: eventType,
      data: enhancedMetrics
    });
    
    console.log(`✅ Successfully tracked enhanced session ${eventType} metrics:`, {
      conversationId,
      eventType,
      metricsSize: Object.keys(enhancedMetrics).length,
      responseTime: responseMetrics.generationTime,
      method: responseMetrics.generationMethod
    });
    
    // Log specific performance events for analytics
    if (responseMetrics.generationTime > 5000) { // Slow response > 5 seconds
      await supabase.from('session_events').insert({
        conversation_id: conversationId,
        event_type: 'performance_warning',
        data: {
          warning_type: 'slow_ai_response',
          response_time: responseMetrics.generationTime,
          threshold: 5000,
          generation_method: responseMetrics.generationMethod
        }
      });
      console.log('⚠️ Logged slow AI response warning');
    }
    
    if (responseMetrics.generationMethod === 'template') {
      await supabase.from('session_events').insert({
        conversation_id: conversationId,
        event_type: 'ai_fallback_used',
        data: {
          fallback_reason: 'openai_unavailable_or_failed',
          response_quality: 'medium',
          alternative_method: 'template_based'
        }
      });
      console.log('🔄 Logged AI fallback usage');
    }
    
  } catch (error) {
    console.error("❌ Error saving enhanced metrics:", error instanceof Error ? error.message : "Unknown error");
    // Non-blocking error - we continue even if metrics tracking fails
  }
}

/**
 * Generate response metrics object with enhanced data
 */
export function createResponseMetrics(
  method: 'template' | 'ai', 
  generationTime: number, 
  participationBalance: number
) {
  const baseMetrics = {
    generationMethod: method,
    generationTime,
    responseQuality: method === 'ai' ? 'high' : 'medium',
    topicRelevance: method === 'ai' ? 'high' : 'medium',
    participationBalance,
    
    // Enhanced metrics
    timestamp: Date.now(),
    isOptimal: method === 'ai' && generationTime < 3000,
    qualityScore: method === 'ai' ? 0.9 : 0.6,
    reliabilityScore: method === 'template' ? 1.0 : 0.8, // Templates are more reliable but less dynamic
    
    // Performance classification
    speedClass: generationTime < 1000 ? 'fast' : generationTime < 3000 ? 'normal' : 'slow',
    methodEfficiency: method === 'ai' ? generationTime / 1000 : generationTime / 100 // Different scales
  };
  
  return baseMetrics;
}

/**
 * Log admin action with enhanced context
 */
export async function logAdminAction(
  supabase: any,
  conversationId: number,
  action: string,
  details?: Record<string, any>
) {
  try {
    await supabase.from('session_events').insert({
      conversation_id: conversationId,
      event_type: 'admin_action',
      data: {
        action_type: action,
        action_details: details || {},
        timestamp: new Date().toISOString(),
        admin_context: {
          user_agent: 'edge_function',
          source: 'facilitator_response_handler'
        }
      }
    });
    console.log(`👨‍💼 Logged admin action: ${action}`);
  } catch (error) {
    console.error("Error logging admin action:", error);
  }
}
