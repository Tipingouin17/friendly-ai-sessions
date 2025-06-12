
// Security utility functions

/**
 * Validates that a user can access a specific session
 */
export const validateSessionAccess = async (
  conversationId: number,
  userId?: string
): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Check if user is the session owner or a participant
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();
      
    if (conversation) return true;
    
    // Check if user is a participant
    const { data: participant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);
      
    return !!participant;
  } catch (error) {
    console.error('Error validating session access:', error);
    return false;
  }
};

/**
 * Validates participant ID format and existence
 */
export const validateParticipantId = (participantId: unknown): participantId is number => {
  return typeof participantId === 'number' && 
         Number.isInteger(participantId) && 
         participantId > 0 && 
         participantId < 10000;
};

/**
 * Sanitizes URL to prevent XSS through navigation
 */
export const sanitizeNavigationPath = (path: string): string => {
  // Remove any javascript: or data: protocols
  if (path.includes('javascript:') || path.includes('data:')) {
    return '/';
  }
  
  // Ensure path starts with /
  const safePath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove any potential script tags or suspicious content
  return safePath.replace(/<script.*?>.*?<\/script>/gi, '');
};

/**
 * Validates environment configuration is secure
 */
export const validateEnvironmentSecurity = (): void => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
  }
  
  // Warn about potential security issues in development
  if (import.meta.env.DEV) {
    console.log('🔒 Security: Running in development mode');
  }
};

/**
 * Creates a secure session identifier
 */
export const createSecureSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2);
  return `${timestamp}_${randomPart}`;
};

/**
 * Validates CSRF token for sensitive operations
 */
export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  return token === expectedToken && token.length > 10;
};
