
/**
 * Enhanced utility functions to help with cross-origin issues
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
 * Enhanced to handle Stripe cookies specifically
 */
export const getSafeCookieParams = (): { sameSite: string; secure: boolean } => {
  const isHttps = window.location.protocol === 'https:';
  const isCrossOrigin = isInCrossOriginContext();
  const isInIframe = window !== window.top;
  
  // Always use 'none' for SameSite in cross-origin contexts (required for Stripe)
  // This ensures cookies will be sent in cross-site requests
  return {
    sameSite: (isCrossOrigin || isInIframe) ? 'none' : 'lax',
    secure: isHttps || isCrossOrigin || isInIframe, // Always secure for cross-origin/iframe contexts
  };
};

/**
 * Apply cookie parameters to any fetch calls in cross-origin contexts
 */
export const applySafeCookieParams = (options: RequestInit = {}): RequestInit => {
  // If we're in a cross-origin context, always include credentials
  return {
    ...options,
    credentials: 'include',
  };
};

/**
 * Detect if we're in a full frame cross-origin context or an iframe
 */
export const isInIframe = (): boolean => {
  try {
    return window !== window.top;
  } catch (e) {
    return true;
  }
};

/**
 * Create a fallback URL for session access issues
 */
export const createSessionFallbackUrl = (sessionId?: string | number): string => {
  const baseUrl = getCurrentOrigin();
  const path = sessionId ? `/session?id=${sessionId}` : '/session';
  return `${baseUrl}${path}`;
};

/**
 * Sets a cookie with proper SameSite attributes for cross-origin contexts
 * Enhanced to handle Stripe cookies in cross-origin contexts
 */
export const setCrossDomainCookie = (name: string, value: string, days = 7): void => {
  const { sameSite, secure } = getSafeCookieParams();
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  
  // Build cookie string with appropriate attributes for cross-domain contexts
  let cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
  
  // Add SameSite attribute
  cookieString += `; SameSite=${sameSite}`;
  
  // Add Secure attribute if needed
  if (secure) {
    cookieString += '; Secure';
  }
  
  document.cookie = cookieString;
};

/**
 * Gets a cookie value by name
 */
export const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
};

/**
 * Specifically handle Stripe cookies in cross-origin contexts
 */
export const handleStripeCookies = (): void => {
  // Check if we're in a context where Stripe cookies need special handling
  if (isInCrossOriginContext() || isInIframe()) {
    // Attempt to fix Stripe cookies by checking for their presence and re-setting them
    const stripeMid = getCookie('__stripe_mid');
    const stripeSid = getCookie('__stripe_sid');
    
    if (stripeMid) {
      setCrossDomainCookie('__stripe_mid', stripeMid);
    }
    
    if (stripeSid) {
      setCrossDomainCookie('__stripe_sid', stripeSid);
    }
  }
};
