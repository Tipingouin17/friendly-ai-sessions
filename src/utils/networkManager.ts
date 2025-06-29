
import { supabase } from '@/integrations/supabase/client';

interface RequestCache {
  [key: string]: {
    promise: Promise<any>;
    timestamp: number;
    data?: any;
  };
}

class NetworkManager {
  private cache: RequestCache = {};
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY = 1000; // 1 second

  private generateCacheKey(table: string, filter: Record<string, any>): string {
    return `${table}_${JSON.stringify(filter)}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        console.log(`Network attempt ${attempt + 1}/${retries + 1} failed:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        const delay = this.BASE_DELAY * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    throw new Error('All retry attempts failed');
  }

  async fetchWithCache<T>(
    table: string,
    query: any,
    cacheKey?: string
  ): Promise<T> {
    const key = cacheKey || this.generateCacheKey(table, {});
    const now = Date.now();
    
    // Check if we have a cached request
    if (this.cache[key]) {
      const cached = this.cache[key];
      
      // If request is still fresh, return cached promise
      if (now - cached.timestamp < this.CACHE_DURATION) {
        console.log(`Using cached request for ${key}`);
        return cached.promise;
      }
      
      // Clean up expired cache
      delete this.cache[key];
    }
    
    console.log(`Creating new request for ${key}`);
    
    // Create new request with retry logic
    const promise = this.retryWithBackoff(async () => {
      const result = await query;
      if (result.error) {
        throw new Error(`Database error: ${result.error.message}`);
      }
      return result;
    });
    
    // Cache the promise
    this.cache[key] = {
      promise,
      timestamp: now
    };
    
    return promise;
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      Object.keys(this.cache).forEach(key => {
        if (key.includes(pattern)) {
          delete this.cache[key];
        }
      });
    } else {
      this.cache = {};
    }
  }

  getCacheStats(): { totalEntries: number; keys: string[] } {
    return {
      totalEntries: Object.keys(this.cache).length,
      keys: Object.keys(this.cache)
    };
  }
}

export const networkManager = new NetworkManager();
