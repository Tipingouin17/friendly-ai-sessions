
/**
 * Utility functions to help with cross-origin issues
 */

/**
 * Checks if the current context is cross-origin (different from the parent frame)
 * This helps identify when we're in an iframe or embedded context
 */
export const isInCrossOriginContext = (): boolean => {
  try {
    // If we can access parent.location, we're in same-origin context
    return window.parent !== window && typeof window.parent.location.href === 'undefined';
  } catch (e) {
    // Access to parent.location throws error in cross-origin context
    return true;
  }
};

/**
 * Gets the current origin for proper URL construction
 */
export const getCurrentOrigin = (): string => {
  return window.location.origin;
};

/**
 * Creates a URL that works in both same-origin and cross-origin contexts
 */
export const createSafeUrl = (path: string): string => {
  const origin = getCurrentOrigin();
  // Ensure path starts with slash
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${safePath}`;
};

/**
 * Safely handle cookies in cross-origin contexts by adding appropriate parameters
 */
export const getSafeCookieParams = (): { sameSite: string; secure: boolean } => {
  const isHttps = window.location.protocol === 'https:';
  
  return {
    sameSite: isInCrossOriginContext() ? 'None' : 'Lax',
    secure: isHttps, // Only set secure flag on HTTPS
  };
};
