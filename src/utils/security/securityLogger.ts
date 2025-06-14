
/**
 * Security event logging utilities
 */

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
