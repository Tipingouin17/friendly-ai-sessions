
import React from 'react';

/**
 * Custom hook to log the render count of a component
 * @param componentName Name of the component to track
 */
export function useRenderCounter(componentName: string) {
  const renderCount = React.useRef(0);
  console.log(`${componentName} render #${++renderCount.current}`);
  
  // If render count gets too high, warn about potential infinite loop
  if (renderCount.current > 25) {
    console.warn(`⚠️ ${componentName} has rendered ${renderCount.current} times! Check for infinite render loops.`);
  }
}

/**
 * Helper to track state/prop changes between renders
 * @param props Object containing props/state to track
 * @param componentName Name of the component
 */
export function trackChanges(props: Record<string, any>, componentName: string) {
  const prevProps = React.useRef<Record<string, any>>({});
  
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
    console.log(`${componentName} props changed:`, changedProps);
  }
  
  // Update stored props
  prevProps.current = { ...props };
}
