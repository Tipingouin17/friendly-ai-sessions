
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
    }, 150);
    
    // Final scroll after longer delay to catch any lazy-loaded content
    const finalTimeoutId = setTimeout(() => {
      scrollToBottom();
    }, 500);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(finalTimeoutId);
    };
  }, [...dependencies]);

  return { ref, scrollToBottom };
}
