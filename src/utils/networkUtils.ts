
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  };

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain types of errors or abort errors
      if (isNonRetryableError(error) || isAbortError(error)) {
        throw error;
      }
      
      if (attempt === maxAttempts) {
        break;
      }
      
      const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function isNonRetryableError(error: any): boolean {
  // Don't retry on auth errors, not found errors, etc.
  if (error?.code === 'PGRST301' || error?.code === 'PGRST204') {
    return true;
  }
  
  // Don't retry on 4xx errors except for 429 (rate limiting)
  if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
    return true;
  }
  
  return false;
}

export function isAbortError(error: any): boolean {
  return error?.name === 'AbortError' || 
         error?.message?.includes('abort') ||
         error?.message?.includes('signal is aborted');
}

export function isNetworkError(error: any): boolean {
  // Include AbortError as a recoverable network error for UI purposes
  if (isAbortError(error)) {
    return true;
  }
  
  return error?.message?.includes('Failed to fetch') ||
         error?.message?.includes('Network request failed') ||
         error?.name === 'TypeError' ||
         error?.code === 'NETWORK_ERROR';
}
