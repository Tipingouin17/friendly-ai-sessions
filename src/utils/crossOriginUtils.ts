
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
  const isInIframeContext = window !== window.top;
  
  // Always use 'none' for SameSite in cross-origin contexts (required for Stripe)
  // This ensures cookies will be sent in cross-site requests
  return {
    sameSite: (isCrossOrigin || isInIframeContext) ? 'none' : 'lax',
    secure: isHttps || isCrossOrigin || isInIframeContext, // Always secure for cross-origin/iframe contexts
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
  
  // For cross-origin contexts, force SameSite to 'None'
  const isCrossOrigin = isInCrossOriginContext() || isInIframe();
  cookieString += `; SameSite=${isCrossOrigin ? 'None' : sameSite}`;
  
  // Add Secure attribute if needed - always add it for cross-origin
  if (secure || isCrossOrigin) {
    cookieString += '; Secure';
  }
  
  console.log(`Setting cookie ${name} with SameSite=${isCrossOrigin ? 'None' : sameSite}`);
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
 * Automatically called when needed
 */
export const handleStripeCookies = (): void => {
  // Check if we're in a context where Stripe cookies need special handling
  if (isInCrossOriginContext() || isInIframe()) {
    console.log("Handling Stripe cookies for cross-origin context");
    // Attempt to fix Stripe cookies by checking for their presence and re-setting them
    const stripeMid = getCookie('__stripe_mid');
    const stripeSid = getCookie('__stripe_sid');
    
    // Always set cookies with SameSite=None in cross-origin contexts
    // This is critical for Stripe to work across origins
    
    const expires = new Date();
    expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // If cookies exist, preserve their values, otherwise use placeholders
    const midValue = stripeMid || 'placeholder-mid';
    const sidValue = stripeSid || 'placeholder-sid';
    
    // Set the cookies with SameSite=None and Secure
    document.cookie = `__stripe_mid=${midValue}; expires=${expires.toUTCString()}; path=/; SameSite=None; Secure`;
    document.cookie = `__stripe_sid=${sidValue}; expires=${expires.toUTCString()}; path=/; SameSite=None; Secure`;
    
    console.log("Cross-origin Stripe cookies set with SameSite=None");
  }
};

// Call automatically when importing this file
// This makes sure Stripe cookies are properly set early
if (typeof window !== 'undefined') {
  // Add a small delay to ensure it runs after page load
  setTimeout(handleStripeCookies, 100);
}
