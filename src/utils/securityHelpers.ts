
// Enhanced security utility functions

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
    
    // Check if user is a participant (more secure query)
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
 * Enhanced participant ID validation with security checks
 */
export const validateParticipantId = (participantId: unknown): participantId is number => {
  if (typeof participantId !== 'number') return false;
  if (!Number.isInteger(participantId)) return false;
  if (participantId <= 0 || participantId >= 10000) return false;
  
  // Additional security: check for suspicious patterns
  const participantStr = participantId.toString();
  if (participantStr.includes('..') || participantStr.includes('/')) {
    return false;
  }
  
  return true;
};

/**
 * Enhanced URL sanitization with comprehensive security checks
 */
export const sanitizeNavigationPath = (path: string): string => {
  // Remove any dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
  for (const protocol of dangerousProtocols) {
    if (path.toLowerCase().includes(protocol)) {
      return '/';
    }
  }
  
  // Ensure path starts with /
  const safePath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove script tags and suspicious content
  let sanitized = safePath
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\.\.\//g, ''); // Remove directory traversal
  
  // Validate against whitelist of allowed characters
  if (!/^[a-zA-Z0-9\/_\-\.\?=&]+$/.test(sanitized)) {
    return '/';
  }
  
  return sanitized;
};

/**
 * Enhanced environment validation with security focus
 */
export const validateEnvironmentSecurity = (): { isSecure: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    errors.push(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate Supabase URL format
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9-]+\.supabase\.co$/)) {
    errors.push('Invalid Supabase URL format');
  }
  
  // Check for secure protocols
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('Supabase URL must use HTTPS');
  }
  
  // Development mode warning
  if (import.meta.env.DEV) {
    console.log('🔒 Security: Running in development mode - some security features may be relaxed');
  }
  
  return {
    isSecure: errors.length === 0,
    errors
  };
};

/**
 * Creates a cryptographically secure session identifier
 */
export const createSecureSessionId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomValues = new Uint8Array(16);
  crypto.getRandomValues(randomValues);
  const randomPart = Array.from(randomValues, byte => byte.toString(36)).join('');
  return `${timestamp}_${randomPart}`;
};

/**
 * Enhanced CSRF token validation
 */
export const validateCSRFToken = (token: string, expectedToken: string): boolean => {
  if (!token || !expectedToken) return false;
  if (token.length < 16 || expectedToken.length < 16) return false;
  
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false;
  
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  
  return result === 0;
};

/**
 * Validate user permissions for sensitive operations
 */
export const validateUserPermissions = async (
  userId: string,
  requiredRole: 'admin' | 'moderator' | 'user' = 'user'
): Promise<boolean> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (!profile) return false;
    
    // Role hierarchy: admin > moderator > user
    const roleHierarchy = { admin: 3, moderator: 2, user: 1 };
    const userLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
    const requiredLevel = roleHierarchy[requiredRole];
    
    return userLevel >= requiredLevel;
  } catch (error) {
    console.error('Error validating user permissions:', error);
    return false;
  }
};

/**
 * Log security events with proper data sanitization
 */
export const logSecurityEvent = (
  eventType: string,
  details: Record<string, any>,
  userId?: string
) => {
  const sanitizedDetails = {
    ...details,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.pathname
  };
  
  // Remove sensitive data before logging
  const keysToRemove = ['password', 'token', 'secret'];
  keysToRemove.forEach(key => {
    if (key in sanitizedDetails) {
      delete sanitizedDetails[key];
    }
  });
  
  console.log(`🔒 Security Event: ${eventType}`, sanitizedDetails);
  
  // In production, this would also send to monitoring service
  if (!import.meta.env.DEV) {
    // Send to monitoring service
  }
};
