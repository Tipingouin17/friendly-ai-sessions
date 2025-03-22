
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
  
  // If render count gets too high, warn about potential infinite loop
  if (renderCount.current > 25) {
    logger.warn(`Component has rendered ${renderCount.current} times! Check for potential infinite render loops.`);
  }
}

/**
 * Helper to track state/prop changes between renders
 * @param props Object containing props/state to track
 * @param componentName Name of the component
 */
export function trackChanges(props: Record<string, any>, componentName: string) {
  const prevProps = React.useRef<Record<string, any>>({});
  const logger = createLogger(componentName, "state");
  
  // On first render, just store the props
  if (Object.keys(prevProps.current).length === 0) {
    prevProps.current = { ...props };
    return;
  }
  
  // Track which props have changed
  const changedProps: Record<string, { from: any, to: any }> = {};
  
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
  
  // Update stored props
  prevProps.current = { ...props };
}

/**
 * Check if a value is a function
 * @param value Value to check
 */
export function isFunction(value: any): boolean {
  return typeof value === 'function';
}

/**
 * Helper to debug React hook dependencies
 * @param dependencies Array of dependencies
 * @param hookName Name of the hook 
 */
export function logDependencyChanges(dependencies: any[], hookName: string) {
  const prevDepsRef = React.useRef<any[]>([]);
  const logger = createLogger(hookName, "state");
  
  React.useEffect(() => {
    if (prevDepsRef.current.length === 0) {
      prevDepsRef.current = [...dependencies];
      return;
    }
    
    const changes: {index: number, from: any, to: any}[] = [];
    
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
  }, dependencies);
}

/**
 * Detect memoization issues by logging when expected memoized values change
 * @param value The value to monitor
 * @param dependencies The expected dependencies
 * @param valueName Name of the value for logging
 */
export function checkMemoization(value: any, dependencies: any[], valueName: string) {
  const prevValueRef = React.useRef<any>(null);
  const renderCountRef = React.useRef(0);
  const logger = createLogger("MemoCheck", "rendering");
  
  if (renderCountRef.current > 0 && prevValueRef.current !== value) {
    logger.warn(`Memoization failed for ${valueName}. Value changed when dependencies shouldn't have changed.`);
    
    // Try to find which dependency might have changed
    const prevDepsRef = React.useRef<any[]>([]);
    
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
