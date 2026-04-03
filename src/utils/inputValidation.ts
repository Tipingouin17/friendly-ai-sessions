/**
 * input Validation
 *
 * Utility for the AIfacilitator application.
 */

import DOMPurify from 'dompurify';
import { z } from 'zod';

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export const sanitizeHtml = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitizes input by trimming and removing potentially dangerous characters
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Validates message content before storage
 */
export const validateMessageContent = (content: string): { isValid: boolean; error?: string } => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Message content is required' };
  }

  if (content.length > 2000) {
    return { isValid: false, error: 'Message content exceeds maximum length of 2000 characters' };
  }

  // Check for potential script injection
  if (content.includes('<script') || content.includes('javascript:')) {
    return { isValid: false, error: 'Invalid content detected' };
  }

  return { isValid: true };
};

/**
 * Validates session title
 */
export const validateSessionTitle = (title: string): { isValid: boolean; error?: string } => {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Session title is required' };
  }

  if (title.length < 3 || title.length > 100) {
    return { isValid: false, error: 'Session title must be between 3 and 100 characters' };
  }

  return { isValid: true };
};

/**
 * Validates participant name
 */
export const validateParticipantName = (name: string): { isValid: boolean; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Participant name is required' };
  }

  if (name.length < 2 || name.length > 50) {
    return { isValid: false, error: 'Participant name must be between 2 and 50 characters' };
  }

  // Only allow alphanumeric characters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z0-9\s\-']+$/.test(name)) {
    return { isValid: false, error: 'Participant name contains invalid characters' };
  }

  return { isValid: true };
};

/**
 * Zod schema for session joining validation
 */
export const sessionJoinSchema = z.object({
  participantName: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  avatarSeed: z.string(),
  conversationId: z.number().positive("Invalid conversation ID"),
  isAnonymous: z.boolean().optional().default(false)
});

/**
 * Zod schema for signup validation
 */
export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

/**
 * Rate limiting helper
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isRateLimited(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return true;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return false;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }
}

/**
 * Creates a rate limiter function
 */
export const createRateLimiter = (limit: number, windowMs: number) => {
  const rateLimiter = new RateLimiter();
  return (key: string) => !rateLimiter.isRateLimited(key, limit, windowMs);
};

export const messagingRateLimiter = new RateLimiter();
export const sessionCreationRateLimiter = new RateLimiter();
