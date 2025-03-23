import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Maximum number of messages to include in context window
export const MAX_CONTEXT_MESSAGES = 15;
export const MAX_TOKEN_ESTIMATE = 4000;

/**
 * Fetches conversation data with detailed session information
 */
export async function fetchConversationData(supabase: any, conversationId: number) {
  console.log('Fetching conversation with ID:', conversationId);
  
  const { data: conversation, error: conversationError } = await supabase
    .from('conversations')
    .select(`
      *,
      sessions:sessions_id (
        id,
        title,
        objective,
        prompt,
        session_type,
        duration_minutes,
        skill_level,
        difficulty_level,
        learning_outcomes,
        prerequisites
      )
    `)
    .eq('id', conversationId)
    .single();

  if (conversationError) {
    console.error("Error fetching conversation:", conversationError.message);
  }
  
  return conversation;
}

/**
 * Fetches participant information for context
 */
export async function fetchParticipantsData(supabase: any, conversationId: number) {
  const { data: participants, error: participantsError } = await supabase
    .from('session_participants')
    .select('*')
    .eq('conversation_id', conversationId);

  if (participantsError) {
    console.error("Error fetching participants:", participantsError.message);
  }
  
  return participants || [];
}

/**
 * Determines session progress based on elapsed time
 */
export function determineSessionProgress(conversation: any, messages: any[]) {
  let sessionProgress = "early";
  if (conversation?.sessions?.duration_minutes) {
    const firstMessageTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date();
    const elapsed = (new Date().getTime() - firstMessageTime.getTime()) / (1000 * 60);
    const progressPercent = Math.min(100, Math.round((elapsed / conversation.sessions.duration_minutes) * 100));
    
    if (progressPercent > 80) sessionProgress = "concluding";
    else if (progressPercent > 40) sessionProgress = "middle";
  }
  return sessionProgress;
}

/**
 * Prune messages to fit within token limit
 */
export function pruneMessagesToFitContext(messages: any[], maxTokens: number): any[] {
  if (messages.length <= MAX_CONTEXT_MESSAGES) {
    return messages;
  }
  
  // Keep the most recent messages and a few from the beginning for context
  const initialMessages = messages.slice(0, 2); // Keep first 2 messages
  const recentMessages = messages.slice(-MAX_CONTEXT_MESSAGES + 2); // Keep most recent messages
  
  return [...initialMessages, ...recentMessages];
}
