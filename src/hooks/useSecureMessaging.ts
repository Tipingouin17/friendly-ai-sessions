/**
 * use Secure Messaging
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useCallback, useRef } from 'react';
import { useSecurityAudit } from './useSecurityAudit';
import { validateMessageContent, createSecureRateLimiter } from '@/utils/security/inputValidation';

interface SecureMessage {
  content: string;
  conversationId: number;
  participantId?: number;
}

export const useSecureMessaging = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();
  const rateLimiter = useRef(createSecureRateLimiter(10, 60000)); // 10 messages per minute
  
  const validateAndSanitizeMessage = useCallback((message: SecureMessage) => {
    const { content, conversationId, participantId } = message;
    
    // Validate conversation ID
    if (!conversationId || !Number.isInteger(conversationId) || conversationId <= 0) {
      logSecurityViolation('invalid_conversation_id_message', { conversationId });
      return { isValid: false, error: 'Invalid session ID' };
    }
    
    // Rate limiting check
    const key = participantId ? `participant-${participantId}` : `conversation-${conversationId}`;
    
    if (rateLimiter.current.isRateLimited(key)) {
      setIsRateLimited(true);
      logSecurityViolation('rate_limit_exceeded', { key });
      return { isValid: false, error: 'Rate limit exceeded. Please slow down.' };
    }
    
    // Enhanced content validation
    const validation = validateMessageContent(content);
    if (!validation.isValid) {
      logSecurityViolation('invalid_message_content', { 
        conversationId, 
        participantId,
        error: validation.error
      });
      return { isValid: false, error: validation.error };
    }
    
    // Additional security checks
    if (!checkMessageSecurity(content)) {
      return { isValid: false, error: 'Message contains potentially harmful content' };
    }
    
    // Log the message for audit
    logSensitiveAction('message_sent', conversationId);
    
    return { isValid: true, sanitizedContent: validation.sanitized };
  }, [logSecurityViolation, logSensitiveAction]);
  
  const checkMessageSecurity = useCallback((content: string): boolean => {
    // Enhanced security checks for suspicious patterns
    const suspiciousPatterns = [
      /(?:password|token|secret|key|api_key)/i,
      /(?:admin|root|sudo|administrator)/i,
      /(?:drop|delete|truncate|alter)\s+table/i,
      /(?:union|select|insert|update)\s+(?:from|into|set)/i,
      /(?:script|iframe|object|embed|form)/i,
      /(?:eval|function|constructor)/i,
      /(?:document\.|window\.|location\.)/i,
      /(?:onclick|onload|onerror|onmouseover)/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        logSecurityViolation('suspicious_message_patterns', { 
          pattern: pattern.toString(),
          content: content.slice(0, 100) // Log first 100 chars for context
        });
        return false;
      }
    }
    
    return true;
  }, [logSecurityViolation]);
  
  // Reset rate limit for a specific key
  const resetRateLimit = useCallback((participantId?: number, conversationId?: number) => {
    const key = participantId ? `participant-${participantId}` : `conversation-${conversationId}`;
    rateLimiter.current.reset(key);
    setIsRateLimited(false);
  }, []);
  
  return {
    validateAndSanitizeMessage,
    checkMessageSecurity,
    resetRateLimit,
    isRateLimited
  };
};
