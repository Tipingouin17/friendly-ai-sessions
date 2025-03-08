
import { useEffect, useRef } from 'react';

export function useScrollToBottom<T extends HTMLElement>(
  dependencies: any[] = []
) {
  const ref = useRef<T>(null);

  const scrollToBottom = () => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [...dependencies]);

  return { ref, scrollToBottom };
}
