
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { validateMessageContent, sanitizeHtml, messagingRateLimiter } from '@/utils/inputValidation';
import { useSecurityAudit } from '@/hooks/useSecurityAudit';

interface SecureMessage {
  content: string;
  conversationId: number;
  participantId?: number;
}

export const useSecureMessaging = () => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const { toast } = useToast();
  const { logSecurityViolation, logSensitiveAction } = useSecurityAudit();

  const validateAndSanitizeMessage = (message: SecureMessage): { 
    isValid: boolean; 
    sanitizedContent?: string; 
    error?: string 
  } => {
    // Rate limiting check
    const rateLimitKey = `message_${message.conversationId}_${message.participantId || 'admin'}`;
    if (messagingRateLimiter.isRateLimited(rateLimitKey, 10, 60000)) { // 10 messages per minute
      setIsRateLimited(true);
      logSecurityViolation('rate_limit_exceeded', {
        type: 'messaging',
        conversationId: message.conversationId,
        participantId: message.participantId
      });
      
      setTimeout(() => setIsRateLimited(false), 60000); // Reset after 1 minute
      return { isValid: false, error: 'Rate limit exceeded. Please wait before sending another message.' };
    }

    // Content validation
    const validation = validateMessageContent(message.content);
    if (!validation.isValid) {
      logSecurityViolation('invalid_message_content', {
        error: validation.error,
        conversationId: message.conversationId
      });
      return validation;
    }

    // Sanitize content
    const sanitizedContent = sanitizeHtml(message.content);
    
    // Log if content was modified during sanitization
    if (sanitizedContent !== message.content) {
      logSecurityViolation('content_sanitized', {
        conversationId: message.conversationId,
        originalLength: message.content.length,
        sanitizedLength: sanitizedContent.length
      });
    }

    // Log normal message activity for audit trail
    logSensitiveAction('message_sent', message.conversationId);

    return { isValid: true, sanitizedContent };
  };

  const checkMessageSecurity = (content: string): boolean => {
    // Additional security checks for suspicious patterns
    const suspiciousPatterns = [
      /eval\s*\(/i,
      /document\.write/i,
      /innerHTML\s*=/i,
      /onclick\s*=/i,
      /onerror\s*=/i,
      /onload\s*=/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        logSecurityViolation('suspicious_message_content', {
          pattern: pattern.toString(),
          contentPreview: content.substring(0, 100)
        });
        return false;
      }
    }

    return true;
  };

  return {
    validateAndSanitizeMessage,
    checkMessageSecurity,
    isRateLimited
  };
};
