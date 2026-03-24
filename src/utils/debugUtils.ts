
import React from 'react';
import { createLogger } from './debugLogger';

/**
 * Custom hook to log the render count of a component
 * @param componentName Name of the component to track
 */
export function useRenderCounter(componentName: string) {
  const renderCount = React.useRef(0);
  const logger = createLogger(componentName, "rendering");
  
  logger.log(`render #${++renderCount.current}`);
  
  if (renderCount.current > 25) {
    logger.warn(`Component has rendered ${renderCount.current} times! Check for potential infinite render loops.`);
  }
}

/**
 * Custom hook to track state/prop changes between renders.
 * Renamed from trackChanges to useTrackChanges to follow React Hooks naming convention.
 * @param props Object containing props/state to track
 * @param componentName Name of the component
 */
export function useTrackChanges(props: Record<string, unknown>, componentName: string) {
  const prevProps = React.useRef<Record<string, unknown>>({ /* no-op */ });
  const logger = createLogger(componentName, "state");
  
  if (Object.keys(prevProps.current).length === 0) {
    prevProps.current = { ...props };
    return;
  }
  
  const changedProps: Record<string, { from: unknown, to: unknown }> = { /* no-op */ };
  
  Object.entries(props).forEach(([key, value]) => {
    if (prevProps.current[key] !== value) {
      changedProps[key] = {
        from: prevProps.current[key],
        to: value
      };
    }
  });
  
  if (Object.keys(changedProps).length > 0) {
    logger.log(`props changed:`, changedProps);
  }
  
  prevProps.current = { ...props };
}

// Keep backward-compatible alias
export const trackChanges = useTrackChanges;

/**
 * Check if a value is a function
 * @param value Value to check
 */
export function isFunction(value: unknown): boolean {
  return typeof value === 'function';
}

/**
 * Custom hook to debug React hook dependencies.
 * Renamed from logDependencyChanges to useLogDependencyChanges to follow React Hooks naming convention.
 * @param dependencies Array of dependencies
 * @param hookName Name of the hook 
 */
export function useLogDependencyChanges(dependencies: unknown[], hookName: string) {
  const prevDepsRef = React.useRef<unknown[]>([]);
  const logger = createLogger(hookName, "state");
  
  React.useEffect(() => {
    if (prevDepsRef.current.length === 0) {
      prevDepsRef.current = [...dependencies];
      return;
    }
    
    const changes: {index: number, from: unknown, to: unknown}[] = [];
    
    dependencies.forEach((dep, index) => {
      if (dep !== prevDepsRef.current[index]) {
        changes.push({
          index,
          from: prevDepsRef.current[index],
          to: dep
        });
      }
    });
    
    if (changes.length > 0) {
      logger.log(`dependencies changed:`, changes);
    }
    
    prevDepsRef.current = [...dependencies];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

// Keep backward-compatible alias
export const logDependencyChanges = useLogDependencyChanges;

/**
 * Custom hook to detect memoization issues by logging when expected memoized values change.
 * Renamed from checkMemoization to useCheckMemoization to follow React Hooks naming convention.
 * @param value The value to monitor
 * @param dependencies The expected dependencies
 * @param valueName Name of the value for logging
 */
export function useCheckMemoization(value: unknown, dependencies: unknown[], valueName: string) {
  const prevValueRef = React.useRef<unknown>(null);
  const renderCountRef = React.useRef(0);
  const prevDepsRef = React.useRef<unknown[]>([]);
  const logger = createLogger("MemoCheck", "rendering");
  
  if (renderCountRef.current > 0 && prevValueRef.current !== value) {
    logger.warn(`Memoization failed for ${valueName}. Value changed when dependencies shouldn't have changed.`);
    
    if (prevDepsRef.current.length > 0) {
      const changedDeps = dependencies.map((dep, i) => {
        if (prevDepsRef.current[i] !== dep) {
          return { index: i, value: dep };
        }
        return null;
      }).filter(Boolean);
      
      if (changedDeps.length > 0) {
        logger.warn('Changes detected in the following dependencies:', changedDeps);
      } else {
        logger.warn('No dependency changes detected, possible issue with the memoization logic');
      }
    }
    
    prevDepsRef.current = [...dependencies];
  }
  
  prevValueRef.current = value;
  renderCountRef.current++;
}

// Keep backward-compatible alias
export const checkMemoization = useCheckMemoization;
