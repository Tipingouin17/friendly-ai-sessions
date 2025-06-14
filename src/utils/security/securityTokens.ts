
/**
 * Security token and ID generation/validation utilities
 */

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
