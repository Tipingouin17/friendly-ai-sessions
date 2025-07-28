/**
 * Enhanced input validation and sanitization utilities
 */

import DOMPurify from 'dompurify';

/**
 * Comprehensive HTML sanitization to prevent XSS attacks
 */
export const sanitizeHtml = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
};

/**
 * Enhanced input sanitization with XSS protection
 */
export const sanitizeInput = (input: string): string => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '') // Remove iframe tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, 10000); // Limit length to prevent DoS
};

/**
 * Validate and sanitize message content with comprehensive security checks
 */
export const validateMessageContent = (content: string): { isValid: boolean; sanitized?: string; error?: string } => {
  if (!content || typeof content !== 'string') {
    return { isValid: false, error: 'Content is required' };
  }

  const trimmed = content.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Content cannot be empty' };
  }

  if (trimmed.length > 5000) {
    return { isValid: false, error: 'Content is too long (max 5000 characters)' };
  }

  // Check for potential XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe[^>]*>/gi,
    /<object[^>]*>/gi,
    /<embed[^>]*>/gi,
  ];

  for (const pattern of xssPatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: 'Content contains potentially dangerous elements' };
    }
  }

  const sanitized = sanitizeInput(content);
  return { isValid: true, sanitized };
};

/**
 * Validate session title with enhanced security
 */
export const validateSessionTitle = (title: string): { isValid: boolean; sanitized?: string; error?: string } => {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required' };
  }

  const trimmed = title.trim();
  
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Title must be at least 3 characters long' };
  }

  if (trimmed.length > 100) {
    return { isValid: false, error: 'Title must be less than 100 characters' };
  }

  const sanitized = sanitizeInput(trimmed);
  return { isValid: true, sanitized };
};

/**
 * Validate participant name with security checks
 */
export const validateParticipantName = (name: string): { isValid: boolean; sanitized?: string; error?: string } => {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();
  
  if (trimmed.length < 1) {
    return { isValid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: 'Name must be less than 50 characters' };
  }

  // Only allow letters, numbers, spaces, and common punctuation
  if (!/^[a-zA-Z0-9\s\-_.]+$/.test(trimmed)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }

  const sanitized = sanitizeInput(trimmed);
  return { isValid: true, sanitized };
};

/**
 * Validate conversation ID with security checks
 */
export const validateConversationId = (id: unknown): id is number => {
  if (typeof id !== 'number') return false;
  if (!Number.isInteger(id)) return false;
  if (id <= 0) return false;
  if (id > Number.MAX_SAFE_INTEGER) return false;
  return true;
};

/**
 * Validate participant ID with enhanced security
 */
export const validateParticipantId = (id: unknown): id is number => {
  if (typeof id !== 'number') return false;
  if (!Number.isInteger(id)) return false;
  if (id <= 0) return false;
  if (id > 999999) return false; // Reasonable upper bound
  return true;
};

/**
 * Enhanced rate limiter with memory cleanup
 */
export class SecureRateLimiter {
  private requests: Map<string, { count: number; firstRequest: number; blocked: boolean }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private limit: number = 10, private windowMs: number = 60000) {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  isRateLimited(key: string): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record) {
      this.requests.set(key, { count: 1, firstRequest: now, blocked: false });
      return false;
    }

    // Reset if window has passed
    if (now - record.firstRequest > this.windowMs) {
      this.requests.set(key, { count: 1, firstRequest: now, blocked: false });
      return false;
    }

    record.count++;

    // Block if limit exceeded
    if (record.count > this.limit) {
      record.blocked = true;
      return true;
    }

    return false;
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now - record.firstRequest > this.windowMs) {
        this.requests.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

/**
 * Create a secure rate limiter function
 */
export const createSecureRateLimiter = (limit: number = 10, windowMs: number = 60000) => {
  const limiter = new SecureRateLimiter(limit, windowMs);
  return {
    isRateLimited: (key: string) => limiter.isRateLimited(key),
    reset: (key: string) => limiter.reset(key),
    destroy: () => limiter.destroy()
  };
};