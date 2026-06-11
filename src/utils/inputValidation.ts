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
 * Sanitizes input by trimming and removing potentially dangerous characters.
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

/**
 * Normalizes user-facing names and free-text labels so whitespace-only values
 * cannot pass validation and copied names do not keep accidental spacing.
 */
export const normalizeWhitespace = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

export const normalizePersonName = (input: string): string => {
  return normalizeWhitespace(sanitizeInput(input));
};

export const validateEmailAddress = (email: string): { isValid: boolean; error?: string } => {
  const normalized = sanitizeInput(email).toLowerCase();
  if (!normalized) return { isValid: false, error: 'Email address is required' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
};

export type PasswordRequirementKey = 'length' | 'uppercase' | 'lowercase' | 'number' | 'special';

export interface PasswordRequirementStatus {
  key: PasswordRequirementKey;
  label: string;
  met: boolean;
}

export const getPasswordRequirementStatuses = (password: string): PasswordRequirementStatus[] => ([
  { key: 'length', label: 'At least 8 characters', met: password.length >= 8 },
  { key: 'uppercase', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
  { key: 'lowercase', label: 'One lowercase letter', met: /[a-z]/.test(password) },
  { key: 'number', label: 'One number', met: /\d/.test(password) },
  { key: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
]);

export const validatePasswordStrength = (password: string): { isValid: boolean; error?: string; missingRequirements: string[] } => {
  const missingRequirements = getPasswordRequirementStatuses(password)
    .filter((requirement) => !requirement.met)
    .map((requirement) => requirement.label.toLowerCase());

  if (missingRequirements.length > 0) {
    return {
      isValid: false,
      error: `Password must include ${missingRequirements.join(', ')}.`,
      missingRequirements,
    };
  }

  return { isValid: true, missingRequirements: [] };
};

/**
 * Maximum length for a single participant message in the UI.
 * Set to 2000 characters to allow rich, detailed responses.
 * Context window management is handled server-side via smart pre-compression:
 * messages exceeding the per-model threshold are summarised by a fast model
 * before being included in the AI context, so participants are never restricted.
 */
export const MAX_MESSAGE_LENGTH = 2000;

/**
 * Validates message content before storage
 */
export const validateMessageContent = (content: string): { isValid: boolean; error?: string } => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Message content is required' };
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
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
  name: z.string()
    .transform((value) => normalizePersonName(value))
    .refine((value) => value.length >= 2, "Name must be at least 2 characters")
    .refine((value) => value.length <= 100, "Name must be less than 100 characters")
    .refine((value) => /[A-Za-z0-9]/.test(value), "Name must include visible characters"),
  email: z.string()
    .transform((value) => sanitizeInput(value).toLowerCase())
    .refine((value) => validateEmailAddress(value).isValid, "Please enter a valid email address"),
  password: z.string().superRefine((value, ctx) => {
    const result = validatePasswordStrength(value);
    if (!result.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error ?? "Password does not meet the security requirements",
      });
    }
  })
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
