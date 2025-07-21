
/**
 * Enhanced message deduplication utilities with database-level locking and fallback mechanisms
 */

interface PendingGeneration {
  conversationId: number;
  timestamp: number;
  requestId: string;
  lockExpiry: number;
  attempts: number;
}

// In-memory store for pending generations with enhanced locking
const pendingGenerations = new Map<number, PendingGeneration>();
const GENERATION_TIMEOUT = 45000; // 45 seconds (increased)
const LOCK_EXTENSION_TIME = 20000; // 20 seconds
const MAX_ATTEMPTS = 3; // Maximum attempts before fallback

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
    // Allow retry if we haven't exceeded max attempts
    if (existing.attempts < MAX_ATTEMPTS) {
      console.log(`🔄 Allowing retry for conversation: ${conversationId} (attempt ${existing.attempts + 1}/${MAX_ATTEMPTS})`);
      existing.attempts++;
      existing.lockExpiry = now + GENERATION_TIMEOUT;
      return true;
    }
    
    console.log(`🔒 Generation blocked for conversation: ${conversationId}`, {
      existingRequestId: existing.requestId,
      currentRequestId: requestId,
      timeRemaining: existing.lockExpiry - now,
      attempts: existing.attempts
    });
    return false;
  }
  
  // Lock the generation with extended timeout
  pendingGenerations.set(conversationId, {
    conversationId,
    timestamp: now,
    requestId,
    lockExpiry: now + GENERATION_TIMEOUT,
    attempts: 1
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
    // First check if we already have a welcome message
    const { data: existingMessages, error: messageError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('role', 'assistant')
      .limit(1);
    
    if (messageError) {
      console.log(`⚠️ Error checking existing messages for conversation ${conversationId}:`, messageError);
    } else if (existingMessages && existingMessages.length > 0) {
      console.log(`📭 Welcome message already exists for conversation ${conversationId}, skipping generation`);
      return false;
    }
    
    // Try to update the welcome_message_status only if it's 'pending' or 'ai_generating'
    const { data, error } = await supabase
      .from('conversations')
      .update({ 
        welcome_message_status: 'ai_generating',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .in('welcome_message_status', ['pending', 'ai_generating']) // Allow retry on ai_generating
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

export async function createFallbackWelcomeMessage(supabase: any, conversationId: number): Promise<boolean> {
  try {
    console.log(`🎯 Creating fallback welcome message for conversation ${conversationId}`);
    
    // Get conversation and session data
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        sessions (
          *,
          facilitator_details:facilitators(*)
        )
      `)
      .eq('id', conversationId)
      .single();
    
    if (convError) {
      console.error(`❌ Error fetching conversation data for fallback:`, convError);
      return false;
    }
    
    const facilitatorName = conversation.sessions?.facilitator_details?.title || 'your facilitator';
    const sessionTitle = conversation.sessions?.title || 'this session';
    const objective = conversation.sessions?.objective || 'facilitate meaningful discussion';
    
    // Create fallback welcome message
    const fallbackContent = {
      text: `Welcome to ${sessionTitle}! I'm ${facilitatorName}, and I'm excited to have you join us today.\n\nOur objective for today is: ${objective}\n\nTo get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?\n\nI'm looking forward to our discussion and learning from each of your unique perspectives!`,
      avatar: conversation.sessions?.facilitator_details?.profile_picture || '/api/avatar?name=Facilitator&variant=beam&palette=2'
    };
    
    // Insert the fallback message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: fallbackContent,
        role: 'assistant',
        name: facilitatorName,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error(`❌ Error creating fallback message:`, insertError);
      return false;
    }
    
    // Update conversation status
    await supabase
      .from('conversations')
      .update({ 
        welcome_message_status: 'fallback_ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);
    
    console.log(`✅ Fallback welcome message created for conversation ${conversationId}`);
    return true;
    
  } catch (error) {
    console.error(`💥 Exception creating fallback welcome message:`, error);
    return false;
  }
}
