
/**
 * Utility functions for handling cross-origin contexts
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
    console.log("Detected cross-origin context");
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
