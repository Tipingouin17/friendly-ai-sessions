
interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private requestTimeout = 30000; // 30 seconds

  async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    // Check if we have a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing) {
      // Check if the request hasn't timed out
      if (Date.now() - existing.timestamp < this.requestTimeout) {
        console.log(`Deduplicating request for key: ${key}`);
        return existing.promise;
      } else {
        // Remove timed out request
        this.pendingRequests.delete(key);
      }
    }

    // Create new request
    const promise = operation();
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });

    // Clean up after completion
    promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    return promise;
  }

  clear(key?: string) {
    if (key) {
      this.pendingRequests.delete(key);
    } else {
      this.pendingRequests.clear();
    }
  }
}

export const requestDeduplicator = new RequestDeduplicator();
