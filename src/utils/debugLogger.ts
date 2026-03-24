
/**
 * Debug logger utility to manage console logs across the application.
 * In production mode, only errors and warnings are logged.
 * Debug logs are suppressed unless explicitly enabled via VITE_DEBUG=true.
 */

const IS_PRODUCTION = import.meta.env.PROD;
const DEBUG_ENABLED = import.meta.env.VITE_DEBUG === 'true';

// Configuration for which log categories are enabled (only active in development or when VITE_DEBUG=true)
const DEBUG_CONFIG = {
  session: false,
  provider: false,
  initialization: false,
  connection: false,
  participants: false,
  messages: false,
  conversation: false,
  rendering: false,
  state: false,
  errors: true,
  warnings: true,
  admin: false,
  all: false,
};

/**
 * Logger function that respects debug configuration.
 * Suppressed entirely in production unless VITE_DEBUG is set.
 */
export function debugLog(
  category: keyof typeof DEBUG_CONFIG,
  message: string,
  ...data: unknown[]
) {
  if (IS_PRODUCTION && !DEBUG_ENABLED) return;
  if (!DEBUG_CONFIG[category] && !DEBUG_ENABLED) return;

   
  console.log(`[${category.toUpperCase()}] ${message}`, ...data);
}

/**
 * Log errors - always active in all environments.
 */
export function errorLog(message: string, ...data: unknown[]) {
  console.error(`[ERROR] ${message}`, ...data);
}

/**
 * Log warnings - always active in all environments.
 */
export function warnLog(message: string, ...data: unknown[]) {
  console.warn(`[WARN] ${message}`, ...data);
}

/**
 * Helper to create a namespaced logger for a specific component.
 */
export function createLogger(component: string, defaultCategory: keyof typeof DEBUG_CONFIG = 'all') {
  const timestamp = () => new Date().toISOString().split('T')[1].split('.')[0];

  return {
    log: (message: string, ...data: unknown[]) =>
      debugLog(defaultCategory, `[${timestamp()}] ${component}: ${message}`, ...data),

    error: (message: string, ...data: unknown[]) =>
      errorLog(`[${timestamp()}] ${component}: ${message}`, ...data),

    warn: (message: string, ...data: unknown[]) =>
      warnLog(`[${timestamp()}] ${component}: ${message}`, ...data),

    category: (category: keyof typeof DEBUG_CONFIG, message: string, ...data: unknown[]) =>
      debugLog(category, `[${timestamp()}] ${component}: ${message}`, ...data)
  };
}

export const debugConfig = DEBUG_CONFIG;
