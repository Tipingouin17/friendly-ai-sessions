
/**
 * Enhanced message deduplication utilities with database-level locking
 */

interface PendingGeneration {
  conversationId: number;
  timestamp: number;
  requestId: string;
  lockExpiry: number;
}

// In-memory store for pending generations with enhanced locking
const pendingGenerations = new Map<number, PendingGeneration>();
const GENERATION_TIMEOUT = 30000; // 30 seconds
const LOCK_EXTENSION_TIME = 15000; // 15 seconds

export function checkAndLockGeneration(conversationId: number, requestId: string): boolean {
  const now = Date.now();
  
  // Clean up expired locks
  for (const [convId, pending] of pendingGenerations.entries()) {
    if (now > pending.lockExpiry) {
      pendingGenerations.delete(convId);
      console.log(`🧹 Cleaned up expired generation lock for conversation: ${convId}`);
    }
  }
  
  // Check if generation is already in progress
  const existing = pendingGenerations.get(conversationId);
  if (existing && now < existing.lockExpiry) {
    console.log(`🔒 Generation already in progress for conversation: ${conversationId}`, {
      existingRequestId: existing.requestId,
      currentRequestId: requestId,
      timeRemaining: existing.lockExpiry - now
    });
    return false;
  }
  
  // Lock the generation with extended timeout
  pendingGenerations.set(conversationId, {
    conversationId,
    timestamp: now,
    requestId,
    lockExpiry: now + GENERATION_TIMEOUT
  });
  
  console.log(`✅ Locked generation for conversation: ${conversationId}, request: ${requestId}`);
  return true;
}

export function extendLock(conversationId: number, requestId: string): boolean {
  const existing = pendingGenerations.get(conversationId);
  if (existing && existing.requestId === requestId) {
    existing.lockExpiry = Date.now() + LOCK_EXTENSION_TIME;
    console.log(`⏰ Extended lock for conversation: ${conversationId}, request: ${requestId}`);
    return true;
  }
  return false;
}

export function unlockGeneration(conversationId: number, requestId: string): void {
  const existing = pendingGenerations.get(conversationId);
  if (existing && existing.requestId === requestId) {
    pendingGenerations.delete(conversationId);
    console.log(`🔓 Unlocked generation for conversation: ${conversationId}, request: ${requestId}`);
  }
}

export async function checkDatabaseLock(supabase: any, conversationId: number, requestId: string): Promise<boolean> {
  try {
    // Try to update the welcome_message_status only if it's still 'pending'
    const { data, error } = await supabase
      .from('conversations')
      .update({ 
        welcome_message_status: 'ai_generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .eq('welcome_message_status', 'pending')
      .select('id');
    
    if (error) {
      console.log(`⚠️ Database lock failed for conversation ${conversationId}:`, error);
      return false;
    }
    
    const lockAcquired = data && data.length > 0;
    console.log(`🗄️ Database lock result for conversation ${conversationId}: ${lockAcquired ? 'ACQUIRED' : 'FAILED'}`);
    
    return lockAcquired;
  } catch (error) {
    console.error(`💥 Exception acquiring database lock for conversation ${conversationId}:`, error);
    return false;
  }
}

export async function checkExistingMessages(supabase: any, conversationId: number): Promise<boolean> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, role')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .limit(1);
      
    if (error) {
      console.error('❌ Error checking existing messages:', error);
      return false;
    }
    
    const hasWelcomeMessage = messages && messages.length > 0;
    console.log(`📨 Welcome message check for conversation ${conversationId}: ${hasWelcomeMessage ? 'EXISTS' : 'NONE'}`);
    
    return hasWelcomeMessage;
  } catch (error) {
    console.error('💥 Exception checking existing messages:', error);
    return false;
  }
}

export async function releaseDatabaseLock(supabase: any, conversationId: number, status: string = 'ai_ready'): Promise<void> {
  try {
    await supabase
      .from('conversations')
      .update({ 
        welcome_message_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    console.log(`🔓 Released database lock for conversation ${conversationId} with status: ${status}`);
  } catch (error) {
    console.error(`💥 Exception releasing database lock for conversation ${conversationId}:`, error);
  }
}
