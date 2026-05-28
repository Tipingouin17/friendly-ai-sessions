/**
 * Security constants and configuration
 */

export const SECURITY_CONFIG = {
  // Rate limiting
  MESSAGE_RATE_LIMIT: 10, // messages per minute
  MESSAGE_RATE_WINDOW: 60000, // 1 minute in milliseconds
  
  // Content validation
  MAX_MESSAGE_LENGTH: 5000,
  MAX_PARTICIPANT_NAME_LENGTH: 50,
  MAX_SESSION_TITLE_LENGTH: 100,
  MIN_PASSWORD_LENGTH: 8,
  
  // Session validation
  MAX_PARTICIPANT_ID: 999999,
  MAX_CONVERSATION_ID: Number.MAX_SAFE_INTEGER,
  
  // Security timeouts
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  CSRF_TOKEN_LENGTH: 32,
  
  // CORS configuration
  ALLOWED_ORIGINS: ['localhost', '127.0.0.1'],
  
  // Content Security Policy
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "https:"],
    'connect-src': ["'self'", "https:"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'media-src': ["'self'"],
    'frame-src': ["'none'"]
  }
} as const;

export const SUSPICIOUS_PATTERNS = [
  // XSS patterns
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  
  // SQL injection patterns
  /(?:union|select|insert|update|delete|drop)\s+(?:from|into|set|table)/gi,
  /(?:or|and)\s+1\s*=\s*1/gi,
  /(?:;\s*drop\s+table|'\s*or\s+'1'\s*=\s*'1)/gi,
  
  // Command injection patterns
  /(?:;|&&|\|\||\|)\s*(?:rm|cat|ls|pwd|whoami|id)/gi,
  /(?:eval|exec|system|shell_exec|passthru)/gi,
  
  // Sensitive data patterns
  /(?:password|token|secret|key|api_key)\s*[:=]/gi,
  /(?:admin|root|sudo|administrator)\s*[:=]/gi,
  
  // Code execution patterns
  /(?:function|constructor|eval)\s*\(/gi,
  /(?:document\.|window\.|location\.)/gi,
] as const;

export const SECURE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(self), camera=(self)',
} as const;