
/**
 * Debug logger utility to manage console logs across the application
 * Provides a way to selectively enable/disable logs by category
 */

// Configuration for which log categories are enabled
const DEBUG_CONFIG = {
  // Core logs
  session: false,          // Session setup and management
  provider: false,         // Session provider internals
  initialization: false,   // Initialization processes
  connection: false,       // Connection and realtime events
  
  // Data logs
  participants: true,      // Participant joining/leaving
  messages: false,         // Message sending/receiving
  conversation: false,     // Conversation data
  
  // UI logs
  rendering: false,        // Component renders
  state: false,            // State changes
  
  // Special cases
  errors: true,            // Always log errors
  warnings: true,          // Always log warnings
  admin: true,             // Admin-specific logs
  all: false,              // Generic logs that don't fit in other categories - DISABLED by default
};

// Enable all logs with this flag (overrides individual settings)
const ENABLE_ALL_LOGS = false;

// Force disable all logs with this flag (highest priority)
const DISABLE_ALL_LOGS = false;

/**
 * Logger function that respects debug configuration
 * @param category The logging category
 * @param message The primary message
 * @param data Optional data to log
 */
export function debugLog(
  category: keyof typeof DEBUG_CONFIG, 
  message: string, 
  ...data: any[]
) {
  // Skip logging if all logs are disabled
  if (DISABLE_ALL_LOGS) return;
  
  // Log everything if all logs are enabled
  if (ENABLE_ALL_LOGS) {
    console.log(`[${category}] ${message}`, ...data);
    return;
  }
  
  // Special case for 'all' category
  if (category === 'all') {
    if (DEBUG_CONFIG.all) {
      console.log(`[INFO] ${message}`, ...data);
    }
    return;
  }
  
  // Check if this category is enabled in config
  if (DEBUG_CONFIG[category]) {
    console.log(`[${category}] ${message}`, ...data);
  }
}

/**
 * Log errors (these generally shouldn't be filtered)
 */
export function errorLog(message: string, ...data: any[]) {
  if (DISABLE_ALL_LOGS) return;
  
  if (ENABLE_ALL_LOGS || DEBUG_CONFIG.errors) {
    console.error(`[ERROR] ${message}`, ...data);
  }
}

/**
 * Log warnings (these generally shouldn't be filtered)
 */
export function warnLog(message: string, ...data: any[]) {
  if (DISABLE_ALL_LOGS) return;
  
  if (ENABLE_ALL_LOGS || DEBUG_CONFIG.warnings) {
    console.warn(`[WARN] ${message}`, ...data);
  }
}

/**
 * Helper to create a namespaced logger for a specific component
 */
export function createLogger(component: string, defaultCategory: keyof typeof DEBUG_CONFIG = 'all') {
  return {
    log: (message: string, ...data: any[]) => 
      debugLog(defaultCategory, `${component}: ${message}`, ...data),
    
    error: (message: string, ...data: any[]) => 
      errorLog(`${component}: ${message}`, ...data),
    
    warn: (message: string, ...data: any[]) => 
      warnLog(`${component}: ${message}`, ...data),
    
    // Allow specifying a different category
    category: (category: keyof typeof DEBUG_CONFIG, message: string, ...data: any[]) => 
      debugLog(category, `${component}: ${message}`, ...data)
  };
}

// Export the config for reference
export const debugConfig = DEBUG_CONFIG;
