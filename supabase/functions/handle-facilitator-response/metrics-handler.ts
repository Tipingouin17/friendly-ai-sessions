
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
  eventType: 'report_generation' | 'facilitator_response'
) {
  try {
    await supabase.from('session_events').insert({
      conversation_id: conversationId,
      event_type: eventType,
      data: {
        metrics: responseMetrics,
        contentLength: responseContent.length,
        topics: userTopics,
        participationStats: participantStats,
        participantCount,
        participantDescription,
        language
      }
    });
    console.log(`Successfully tracked session ${eventType} metrics`);
  } catch (error) {
    console.error("Error saving metrics:", error instanceof Error ? error.message : "Unknown error");
    // Non-blocking error - we continue even if metrics tracking fails
  }
}

/**
 * Generate response metrics object
 */
export function createResponseMetrics(
  method: 'template' | 'ai', 
  generationTime: number, 
  participationBalance: number
) {
  return {
    generationMethod: method,
    generationTime,
    responseQuality: method === 'ai' ? 'high' : 'medium',
    topicRelevance: method === 'ai' ? 'high' : 'medium',
    participationBalance
  };
}
