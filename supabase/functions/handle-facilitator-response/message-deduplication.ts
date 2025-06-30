
/**
 * Message deduplication utilities to prevent duplicate welcome messages
 */

interface PendingGeneration {
  conversationId: number;
  timestamp: number;
  requestId: string;
}

// In-memory store for pending generations (resets on function restart)
const pendingGenerations = new Map<number, PendingGeneration>();
const GENERATION_TIMEOUT = 30000; // 30 seconds

export function checkAndLockGeneration(conversationId: number, requestId: string): boolean {
  const now = Date.now();
  
  // Clean up expired locks
  for (const [convId, pending] of pendingGenerations.entries()) {
    if (now - pending.timestamp > GENERATION_TIMEOUT) {
      pendingGenerations.delete(convId);
      console.log(`🧹 Cleaned up expired generation lock for conversation: ${convId}`);
    }
  }
  
  // Check if generation is already in progress
  const existing = pendingGenerations.get(conversationId);
  if (existing) {
    console.log(`🔒 Generation already in progress for conversation: ${conversationId}`, {
      existingRequestId: existing.requestId,
      currentRequestId: requestId,
      timeSinceStart: now - existing.timestamp
    });
    return false;
  }
  
  // Lock the generation
  pendingGenerations.set(conversationId, {
    conversationId,
    timestamp: now,
    requestId
  });
  
  console.log(`✅ Locked generation for conversation: ${conversationId}, request: ${requestId}`);
  return true;
}

export function unlockGeneration(conversationId: number, requestId: string): void {
  const existing = pendingGenerations.get(conversationId);
  if (existing && existing.requestId === requestId) {
    pendingGenerations.delete(conversationId);
    console.log(`🔓 Unlocked generation for conversation: ${conversationId}, request: ${requestId}`);
  }
}

export async function checkExistingMessages(supabase: any, conversationId: number): Promise<boolean> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);
      
    if (error) {
      console.error('❌ Error checking existing messages:', error);
      return false; // Assume no messages on error to be safe
    }
    
    const hasMessages = messages && messages.length > 0;
    console.log(`📨 Existing messages check for conversation ${conversationId}: ${hasMessages ? 'HAS MESSAGES' : 'NO MESSAGES'}`);
    
    return hasMessages;
  } catch (error) {
    console.error('💥 Exception checking existing messages:', error);
    return false;
  }
}
