
import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Please enter a valid email address');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters');
export const messageSchema = z.string().min(1, 'Message is required').max(5000, 'Message must be less than 5000 characters');
export const participantIdSchema = z.number().int().positive('Participant ID must be a positive integer');
export const conversationIdSchema = z.number().int().positive('Conversation ID must be a positive integer');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

// Session-related validation
export const sessionJoinSchema = z.object({
  participantName: nameSchema,
  avatarSeed: z.string().max(50, 'Avatar seed too long'),
  conversationId: conversationIdSchema,
  isAnonymous: z.boolean().optional().default(false)
});

// Message validation
export const messageContentSchema = z.object({
  content: messageSchema,
  conversationId: conversationIdSchema,
  role: z.enum(['user', 'assistant', 'system']).optional().default('user')
});

// Contact form validation
export const contactFormSchema = z.object({
  fname: nameSchema,
  lname: nameSchema,
  email: emailSchema,
  message: messageSchema
});

// Facilitator creation validation
export const facilitatorSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  details: z.string().max(2000, 'Details too long'),
  description: z.string().max(1000, 'Description too long'),
  specialties: z.array(z.string().max(50)).max(10, 'Too many specialties'),
  languages: z.array(z.string().max(30)).max(5, 'Too many languages'),
  expertise_level: z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
});

// Signup validation schema
export const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema
});

// Sanitization utilities
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const sanitizeInput = (input: string): string => {
  return input.trim().slice(0, 5000); // Limit length and trim whitespace
};

// Rate limiting helper
export const createRateLimiter = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    return true;
  };
};
