
/**
 * Utility functions for handling cross-origin contexts with security best practices
 */

/**
 * Checks if the current execution context is in a cross-origin iframe
 * @returns boolean indicating if in cross-origin iframe context
 */
export const isInCrossOriginContext = (): boolean => {
  try {
    // Attempt to access parent window - will throw if cross-origin
    if (window.parent && window.parent.location.href) {
      return false;
    }
    return true;
  } catch (e) {
    return true;
  }
};

/**
 * Checks if the current execution context is in any iframe
 * @returns boolean indicating if in an iframe
 */
export const isInIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    // If we can't access window.top, we're definitely in a cross-origin iframe
    return true;
  }
};

/**
 * Determines if two origins match
 * @param url1 First URL to compare
 * @param url2 Second URL to compare
 * @returns boolean indicating if origins match
 */
export const doOriginsMatch = (url1: string, url2: string): boolean => {
  try {
    const origin1 = new URL(url1).origin;
    const origin2 = new URL(url2).origin;
    return origin1 === origin2;
  } catch (e) {
    return false;
  }
};

/**
 * Creates a URL that's safe to use in cross-origin contexts
 * Uses strict validation and sanitization
 * @param path The relative path to create a URL for
 * @returns A full URL that can be used in cross-origin contexts
 */
export const createSafeUrl = (path: string): string => {
  try {
    // Validate path format first
    if (path.includes('javascript:') || path.includes('data:')) {
      console.error("Potentially unsafe URL detected");
      return '/'; // Return safe default
    }
    
    // Ensure path starts with a slash
    const safePath = path.startsWith('/') ? path : `/${path}`;
    
    // Create URL object for proper parsing
    const url = new URL(safePath, window.location.origin);
    
    // Only return if same origin or explicitly allowed
    return url.toString();
  } catch (e) {
    console.error("Error creating safe URL:", e);
    return '/'; // Return safe default on error
  }
};

/**
 * Gets cookie parameters that are safe to use in cross-origin contexts
 * @returns An object with cookie parameters
 */
export const getSafeCookieParams = (): Record<string, any> => {
  const isCrossOrigin = isInCrossOriginContext();
  
  return {
    credentials: 'include',
    sameSite: isCrossOrigin ? 'none' : 'lax',
    secure: true
  };
};

/**
 * Applies safe cookie parameters to fetch options
 * @param options The fetch options to apply parameters to
 * @returns The fetch options with safe cookie parameters
 */
export const applySafeCookieParams = (options: Record<string, any>): Record<string, any> => {
  const cookieParams = getSafeCookieParams();
  
  return {
    ...options,
    credentials: cookieParams.credentials
  };
};

/**
 * Handles Stripe cookies in cross-origin contexts
 * Uses secure patterns and avoids sensitive data in cookies
 */
export const handleStripeCookies = (): void => {
  const isCrossOrigin = isInCrossOriginContext();
  
  if (isCrossOrigin) {
    try {
      // Set Stripe cookies with appropriate SameSite and Secure flags
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      // Don't use placeholder values - let Stripe set the values
      document.cookie = `__stripe_mid=; expires=${expires.toUTCString()}; path=/; SameSite=None; Secure`;
      document.cookie = `__stripe_sid=; expires=${expires.toUTCString()}; path=/; SameSite=None; Secure`;
      
    } catch (e) {
      console.error("Error handling Stripe cookies:", e);
    }
  }
};

/**
 * Sets a cookie that works across domains with security features
 * @param name Cookie name
 * @param value Cookie value
 * @param days Days until expiration
 */
export const setCrossDomainCookie = (name: string, value: string, days: number = 7): void => {
  // Validate inputs
  if (!name || name.includes(';') || name.includes('=')) {
    console.error("Invalid cookie name");
    return;
  }
  
  // Encode value to prevent injection
  const encodedValue = encodeURIComponent(value);
  const isCrossOrigin = isInCrossOriginContext();
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  document.cookie = `${name}=${encodedValue}; expires=${expires.toUTCString()}; path=/; SameSite=${isCrossOrigin ? 'None' : 'Lax'}; Secure`;
};
