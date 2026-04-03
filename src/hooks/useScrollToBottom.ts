/**
 * use Scroll To Bottom
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef } from 'react';

export function useScrollToBottom<T extends HTMLElement>(
  dependencies: any[] = []
) {
  const ref = useRef<T>(null);

  const scrollToBottom = () => {
    if (ref.current) {
      // Use a more reliable scrolling technique
      const scrollElement = ref.current.parentElement?.parentElement;
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      } else {
        // Fallback to the standard scrollIntoView
        ref.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    // Use a sequence of timeouts to ensure rendering is complete before scrolling
    // First immediate scroll
    scrollToBottom();
    
    // Follow-up scroll after short delay
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    // Additional scroll after DOM is stable
    const finalTimeoutId = setTimeout(() => {
      scrollToBottom();
    }, 300);
    
    // One more scroll attempt for good measure
    const lastTimeoutId = setTimeout(() => {
      scrollToBottom();
    }, 800);
    
    // Add final scroll for when images, iframes or other resources might have loaded
    const longerTimeoutId = setTimeout(() => {
      scrollToBottom();
    }, 1500);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(finalTimeoutId);
      clearTimeout(lastTimeoutId);
      clearTimeout(longerTimeoutId);
    };
  }, [...dependencies]);

  return { ref, scrollToBottom };
}
