
import { useEffect, useRef } from 'react';

export function useScrollToBottom<T extends HTMLElement>(
  dependencies: any[] = []
) {
  const ref = useRef<T>(null);

  const scrollToBottom = () => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // Use a small timeout to ensure rendering is complete before scrolling
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 150);
    
    return () => clearTimeout(timeoutId);
  }, [...dependencies]);

  return { ref, scrollToBottom };
}
