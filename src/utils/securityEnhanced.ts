/**
 * security Enhanced
 *
 * Utility for the AIfacilitator application.
 */

import { validateSessionAccess, validateParticipantId, createSecureSessionId } from './securityHelpers';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

/**
 * Enhanced security validation for session operations
 */
export const validateSecureSessionOperation = async (
  conversationId: number,
  userId: string,
  operation: string
): Promise<{ isValid: boolean; error?: string }> => {
  try {
    // Basic access validation
    const hasAccess = await validateSessionAccess(conversationId, userId);
    if (!hasAccess) {
      return { isValid: false, error: 'Access denied to this session' };
    }

    // Additional validation based on operation type
    switch (operation) {
      case 'close_session':
        // Only session owner can close sessions
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: conversation } = await supabase
          .from('conversations')
          .select('user_id')
          .eq('id', conversationId)
          .single();
        
        if (conversation?.user_id !== userId) {
          return { isValid: false, error: 'Only session owner can close the session' };
        }
        break;
      
      case 'admin_action':
        // Additional admin validation could go here
        break;
    }

    return { isValid: true };
  } catch (error) {
    console.error('Security validation error:', error);
    return { isValid: false, error: 'Security validation failed' };
  }
};

/**
 * Secure session state management
 */
export const createSecureSessionState = () => {
  const sessionId = createSecureSessionId();
  const timestamp = Date.now();
  
  return {
    sessionId,
    createdAt: timestamp,
    lastActivity: timestamp,
    securityLevel: 'standard'
  };
};

/**
 * Environment security validation
 */
export const validateSecureEnvironment = (): { isSecure: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  // Check for required environment variables
  if (!import.meta.env.VITE_API_URL) {
    warnings.push('Supabase URL not configured');
  }
  
  if (!import.meta.env.VITE_API_ANON_KEY) {
    warnings.push('Supabase anonymous key not configured');
  }
  
  // Check if in development mode
  if (import.meta.env.DEV) {
    warnings.push('Running in development mode - reduced security');
  }
  
  // Validate URL protocols
  if (import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.startsWith('https://')) {
    warnings.push('Supabase URL should use HTTPS');
  }
  
  return {
    isSecure: warnings.length === 0,
    warnings
  };
};

/**
 * Content Security Policy helpers
 */
export const enforceContentSecurity = (content: string): { isSafe: boolean; sanitized: string } => {
  // Remove potentially dangerous content
  const sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
  
  const isSafe = sanitized === content;
  
  return { isSafe, sanitized };
};
