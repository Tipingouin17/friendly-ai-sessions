/**
 * useScrollToBottom
 *
 * Smart auto-scroll hook for the chat message list.
 *
 * Behaviour:
 * - When a new message arrives and the user is already near the bottom
 *   (within SCROLL_THRESHOLD px), the list scrolls down automatically.
 * - When the user has scrolled up to read older messages, auto-scroll is
 *   suppressed so they are not forcibly jumped back to the bottom.
 * - `scrollToBottom()` is exposed for manual "scroll to latest" actions
 *   (e.g. a "↓ New messages" button).
 * - `isNearBottom` is exposed so callers can show/hide such a button.
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/** Distance from the bottom (in px) within which auto-scroll is active. */
const SCROLL_THRESHOLD = 120;

export function useScrollToBottom<T extends HTMLElement>(
  dependencies: any[] = []
) {
  /** Ref attached to the sentinel element at the end of the message list. */
  const ref = useRef<T>(null);

  /** Whether the user is currently near the bottom of the scroll container. */
  const [isNearBottom, setIsNearBottom] = useState(true);

  /**
   * Resolve the scrollable container.
   * The sentinel `ref` is the last child inside the scrollable div, so we
   * walk up to find the first ancestor that actually scrolls.
   */
  const getScrollContainer = useCallback((): HTMLElement | null => {
    if (!ref.current) return null;
    let el: HTMLElement | null = ref.current.parentElement;
    while (el) {
      if (el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return null;
  }, []);

  /** Scroll the container to the very bottom. */
  const scrollToBottom = useCallback(() => {
    const container = getScrollContainer();
    if (container) {
      container.scrollTop = container.scrollHeight;
    } else if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [getScrollContainer]);

  /** Track whether the user is near the bottom so we know when to auto-scroll. */
  useEffect(() => {
    const container = getScrollContainer();
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsNearBottom(distanceFromBottom <= SCROLL_THRESHOLD);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set the initial state
    handleScroll();

    return () => container.removeEventListener('scroll', handleScroll);
  }, [getScrollContainer]);

  /**
   * Auto-scroll when dependencies change (new messages, typing indicators, etc.)
   * — but ONLY when the user is already near the bottom.
   */
  useEffect(() => {
    if (!isNearBottom) return;

    // Single deferred scroll — one frame is enough for the DOM to paint the
    // new message before we measure scrollHeight.
    const id = requestAnimationFrame(() => scrollToBottom());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  return { ref, scrollToBottom, isNearBottom };
}
