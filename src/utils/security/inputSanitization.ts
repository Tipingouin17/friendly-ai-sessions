
/**
 * Input sanitization and path validation utilities
 */

/**
 * Enhanced URL sanitization with comprehensive security checks
 */
export const sanitizeNavigationPath = (path: string): string => {
  // Remove any dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
  for (const protocol of dangerousProtocols) {
    if (path.toLowerCase().includes(protocol)) {
      return '/';
    }
  }
  
  // Ensure path starts with /
  const safePath = path.startsWith('/') ? path : `/${path}`;
  
  // Remove script tags and suspicious content
  const sanitized = safePath
    .replace(/<script.*?>.*?<\/script>/gi, '')
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\.\.\//g, ''); // Remove directory traversal
  
  // Validate against whitelist of allowed characters
  if (!/^[a-zA-Z0-9/_.?=&-]+$/.test(sanitized)) {
    return '/';
  }
  
  return sanitized;
};
