/**
 * Performance monitoring utility for tracking timing of host dashboard updates
 */

import { createLogger } from "./debugLogger";

const logger = createLogger('PerformanceMonitor', 'state');

interface PerformanceEntry {
  label: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

class PerformanceMonitor {
  private entries: Map<string, PerformanceEntry> = new Map();
  private sessionId: string = Math.random().toString(36).substr(2, 9);

  /**
   * Start timing a specific operation
   */
  start(label: string, metadata?: any): void {
    const entry: PerformanceEntry = {
      label,
      startTime: performance.now(),
      metadata
    };
    
    this.entries.set(label, entry);
    logger.category('state', `⏱️ Started timing: ${label}`, metadata);
  }

  /**
   * End timing and log the duration
   */
  end(label: string, metadata?: any): number | null {
    const entry = this.entries.get(label);
    if (!entry) {
      logger.category('state', `⚠️ No start entry found for: ${label}`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - entry.startTime;
    
    entry.endTime = endTime;
    entry.duration = duration;

    const logData = {
      duration: `${duration.toFixed(2)}ms`,
      sessionId: this.sessionId,
      startMetadata: entry.metadata,
      endMetadata: metadata
    };

    // Log with different colors based on performance
    if (duration > 1000) {
      logger.category('warnings', `🔴 SLOW: ${label} took ${duration.toFixed(2)}ms`, logData);
    } else if (duration > 500) {
      logger.category('warnings', `🟡 MEDIUM: ${label} took ${duration.toFixed(2)}ms`, logData);
    } else {
      logger.category('state', `🟢 FAST: ${label} took ${duration.toFixed(2)}ms`, logData);
    }

    return duration;
  }

  /**
   * Log a milestone without timing
   */
  mark(label: string, metadata?: any): void {
    const timestamp = performance.now();
    logger.category('state', `📍 Milestone: ${label} at ${timestamp.toFixed(2)}ms`, {
      sessionId: this.sessionId,
      ...metadata
    });
  }

  /**
   * Get all timing entries
   */
  getEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
    this.sessionId = Math.random().toString(36).substr(2, 9);
    logger.category('state', `🧹 Performance monitor cleared, new session: ${this.sessionId}`);
  }

  /**
   * Generate a performance report
   */
  report(): void {
    const entries = this.getEntries().filter(e => e.duration !== undefined);
    const totalTime = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    
    logger.category('state', `📊 Performance Report (Session: ${this.sessionId}):`, {
      totalOperations: entries.length,
      totalTime: `${totalTime.toFixed(2)}ms`,
      entries: entries.map(e => ({
        label: e.label,
        duration: `${(e.duration || 0).toFixed(2)}ms`
      }))
    });
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Convenience functions
export const startTiming = (label: string, metadata?: any) => performanceMonitor.start(label, metadata);
export const endTiming = (label: string, metadata?: any) => performanceMonitor.end(label, metadata);
export const markMilestone = (label: string, metadata?: any) => performanceMonitor.mark(label, metadata);
export const clearPerformanceData = () => performanceMonitor.clear();
export const generatePerformanceReport = () => performanceMonitor.report();