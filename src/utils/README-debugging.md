
# Debugging Utilities

This project includes debugging utilities to help manage console logs and aid in development.

## Debug Logger

The `debugLogger.ts` utility provides a way to selectively enable/disable console logs based on categories, making it easier to focus on relevant information during development.

### Usage

```typescript
import { debugLog, errorLog, warnLog, createLogger } from '@/utils/debugLogger';

// Basic usage
debugLog('session', 'Session initialized', someData);

// For errors (these will show regardless of category settings)
errorLog('Failed to connect', errorObject);

// For warnings
warnLog('Performance issue detected', performanceMetrics);

// Create a logger for a specific component
const logger = createLogger('MyComponent', 'rendering');
logger.log('Component rendered', props);
logger.error('Render failed', error);
logger.warn('Slow render detected');

// Log with a different category
logger.category('connection', 'Establishing connection', connectionDetails);
```

### Configuration

The logging system can be configured in `debugLogger.ts` by modifying the `DEBUG_CONFIG` object:

```typescript
const DEBUG_CONFIG = {
  // Core logs
  session: true,          // Session setup and management
  provider: false,        // Session provider internals
  initialization: true,   // Initialization processes
  connection: true,       // Connection and realtime events
  
  // Data logs
  participants: true,     // Participant joining/leaving
  messages: false,        // Message sending/receiving
  conversation: false,    // Conversation data
  
  // UI logs
  rendering: false,       // Component renders
  state: false,           // State changes
  
  // Special cases
  errors: true,           // Always log errors
  warnings: true,         // Always log warnings
  admin: true,            // Admin-specific logs
};
```

You can also:
- Set `ENABLE_ALL_LOGS = true` to show all logs regardless of category settings
- Set `DISABLE_ALL_LOGS = true` to disable all logs (useful in production)

## Debug Utilities

Additional debugging utilities are available in `debugUtils.ts`:

- `useRenderCounter(componentName)`: Counts and logs component renders
- `trackChanges(props, componentName)`: Tracks prop changes between renders
- `logDependencyChanges(dependencies, hookName)`: Logs when hook dependencies change
- `checkMemoization(value, dependencies, valueName)`: Helps detect memoization issues
