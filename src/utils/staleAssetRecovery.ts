/**
 * Handles the short-lived window during a Vite deployment where a cached page can
 * request a hashed chunk that the new deployment no longer serves. Mobile browsers
 * use several different error messages for this condition, so both Vite preload
 * events and React error boundaries delegate to this one guarded recovery path.
 */

const RECOVERY_MARKER_KEY = 'aifacilitator:stale-asset-recovery-attempted';
const RECOVERY_QUERY_KEY = '__asset_refresh';

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message.toLowerCase();
  if (typeof error === 'string') return error.toLowerCase();
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message.toLowerCase() : '';
  }
  return '';
};

export const isStaleAssetError = (error: unknown): boolean => {
  const message = getErrorMessage(error);
  return [
    'dynamically imported module',
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'failed to load module script',
    'unable to preload css',
    'failed to fetch',
  ].some((needle) => message.includes(needle));
};

/**
 * Returns true only when it scheduled a guarded same-route recovery.  The session
 * marker deliberately survives the refresh so a malformed route or persistent
 * network fault cannot produce an Android reload loop.
 */
export const recoverFromStaleAssetError = (error: unknown): boolean => {
  if (typeof window === 'undefined' || !isStaleAssetError(error)) return false;

  try {
    if (window.sessionStorage.getItem(RECOVERY_MARKER_KEY)) return false;
    window.sessionStorage.setItem(RECOVERY_MARKER_KEY, '1');

    const target = new URL(window.location.href);
    target.searchParams.set(RECOVERY_QUERY_KEY, Date.now().toString(36));
    window.location.replace(target.toString());
    return true;
  } catch {
    return false;
  }
};

export const STALE_ASSET_RECOVERY_EVENT = 'vite:preloadError';
