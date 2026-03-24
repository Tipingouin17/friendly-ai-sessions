
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  abortController?: AbortController;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private requestTimeout = 30000; // 30 seconds

  async deduplicate<T>(key: string, operation: () => Promise<T>, abortSignal?: AbortSignal): Promise<T> {
    // Check if we have a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing) {
      // Check if the request hasn't timed out and isn't aborted
      if (Date.now() - existing.timestamp < this.requestTimeout && 
          !existing.abortController?.signal.aborted) {
        return existing.promise;
      } else {
        // Remove timed out or aborted request
        if (existing.abortController && !existing.abortController.signal.aborted) {
          existing.abortController.abort();
        }
        this.pendingRequests.delete(key);
      }
    }

    // Create new request with abort controller
    const abortController = new AbortController();
    const promise = operation();
    
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      abortController
    });

    // Listen for external abort signal
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        abortController.abort();
        this.pendingRequests.delete(key);
      });
    }

    // Clean up after completion (success or failure)
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  clear(key?: string) {
    if (key) {
      const existing = this.pendingRequests.get(key);
      if (existing?.abortController && !existing.abortController.signal.aborted) {
        existing.abortController.abort();
      }
      this.pendingRequests.delete(key);
    } else {
      // Abort all pending requests
      for (const [, request] of this.pendingRequests) {
        if (request.abortController && !request.abortController.signal.aborted) {
          request.abortController.abort();
        }
      }
      this.pendingRequests.clear();
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator();
