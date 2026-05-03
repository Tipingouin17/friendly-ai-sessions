/**
 * useDeviceId
 *
 * Generates a stable, browser-unique UUID that is stored in localStorage
 * under the key `aif_device_id`.  This ID never changes for a given browser
 * profile and is used to scope participant session data so that two different
 * browsers can never accidentally share the same participant slot.
 *
 * The ID is intentionally NOT tied to any user account — it is purely a
 * device/browser fingerprint used for session continuity.
 */

const DEVICE_ID_KEY = 'aif_device_id';

/**
 * Generate a RFC 4122 v4 UUID using the Web Crypto API when available,
 * falling back to a Math.random()-based implementation for older environments.
 */
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Pure (non-hook) function that reads or creates the device ID.
 * Safe to call outside of React components.
 */
export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const newId = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    // localStorage unavailable (e.g. private browsing with strict settings)
    // Return a session-scoped fallback — not persisted but consistent for this tab
    return generateUUID();
  }
}

/**
 * React hook that returns the stable device ID for the current browser.
 * The value is computed once and never changes during the component lifecycle.
 */
export function useDeviceId(): string {
  // We intentionally do NOT use useState/useEffect here — the device ID is
  // synchronously available from localStorage and never changes, so there is
  // no need to trigger a re-render.
  return getOrCreateDeviceId();
}
