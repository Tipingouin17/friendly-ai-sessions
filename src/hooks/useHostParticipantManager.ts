/**
 * useHostParticipantManager
 *
 * Key design principles:
 * 1. Stable channel topic — `enhanced-host-{conversationId}` with NO timestamp suffix.
 *    The server deduplicates (ws, topic) pairs so re-joining the same topic is safe.
 * 2. All external callbacks stored in refs so they never appear in useCallback/useEffect
 *    dependency arrays. This prevents the channel from being torn down and recreated on
 *    every parent render.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import api from "@/lib/api";
import { removeChannel } from '@/utils/realtimeHelpers';
import { ParticipantInfo } from '@/types/chat';
import { createLogger } from '@/utils/debugLogger';

interface UseEnhancedHostParticipantManagerProps {
  conversationId: number | null;
  onParticipantCountChange?: (count: number) => void;
  onMaxParticipantsChange?: (max: number) => void;
  onParticipantsChange?: (participants: ParticipantInfo[]) => void;
  onSessionStarted?: () => void;
  onSessionFull?: (currentCount: number, maxCount: number) => void;
  enabled?: boolean;
}

export function useHostParticipantManager({
  conversationId,
  onParticipantCountChange,
  onMaxParticipantsChange,
  onParticipantsChange,
  onSessionStarted,
  onSessionFull,
  enabled = true
}: UseEnhancedHostParticipantManagerProps) {
  const logger = createLogger('EnhancedHostParticipantManager', 'admin');

  const [isConnected, setIsConnected] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const channelRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── Callback refs — updated every render, never in dep arrays ──────────────
  const onParticipantCountChangeRef = useRef(onParticipantCountChange);
  const onMaxParticipantsChangeRef   = useRef(onMaxParticipantsChange);
  const onParticipantsChangeRef      = useRef(onParticipantsChange);
  const onSessionStartedRef          = useRef(onSessionStarted);
  const onSessionFullRef             = useRef(onSessionFull);

  useEffect(() => { onParticipantCountChangeRef.current = onParticipantCountChange; });
  useEffect(() => { onMaxParticipantsChangeRef.current  = onMaxParticipantsChange; });
  useEffect(() => { onParticipantsChangeRef.current     = onParticipantsChange; });
  useEffect(() => { onSessionStartedRef.current         = onSessionStarted; });
  useEffect(() => { onSessionFullRef.current            = onSessionFull; });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
      setPollingActive(false);
    }
  }, []);

  // ── Fetch participant list ─────────────────────────────────────────────────
  const fetchParticipantList = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data, error: err } = await api
        .from('session_participants')
        .select('*')
        .eq('conversation_id', conversationId);
      if (err) { logger.category('admin', 'Error fetching participants:', err); return; }
      setIsDataLoaded(true);
      if (data) {
        const updated: ParticipantInfo[] = data.map(p => ({
          id: p.participant_id,
          name: p.name || `Participant ${p.participant_id}`,
          avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
          avatarSeed: p.avatar_seed || null,
          isAnonymous: p.is_anonymous || false,
          isHost: p.is_host || false,
          joinedAt: new Date(p.created_at),
          lastActive: new Date(p.created_at),
        }));
        setParticipants(prev => {
          const changed = prev.length !== updated.length ||
            prev.some((p, i) => p.id !== updated[i]?.id);
          if (changed) {
            onParticipantsChangeRef.current?.(updated);
            return updated;
          }
          return prev;
        });
      }
    } catch (e) {
      logger.category('admin', 'Exception fetching participants:', e);
    }
  }, [conversationId, logger]);

  // ── Fast polling fallback ──────────────────────────────────────────────────
  const startFastPolling = useCallback(() => {
    if (!conversationId || fallbackIntervalRef.current) return;
    logger.category('admin', 'Starting fast polling fallback');
    setPollingActive(true);
    fallbackIntervalRef.current = setInterval(async () => {
      if (!mountedRef.current || !conversationId) return;
      try {
        const { data, error: err } = await api
          .from('conversations')
          .select('current_participants, participants, session_started')
          .eq('id', conversationId)
          .single();
        if (err) { setPollingActive(false); setIsConnected(false); return; }
        if (data) {
          const cur     = data.current_participants || 0;
          const max     = data.participants || 0;
          const started = data.session_started || false;
          setCurrentCount(cur);
          setMaxCount(max);
          setIsSessionStarted(started);
          setIsConnected(true);
          setError('Using polling updates (real-time unavailable)');
          onParticipantCountChangeRef.current?.(cur);
          onMaxParticipantsChangeRef.current?.(max);
          if (max > 0 && cur >= max && !started) onSessionFullRef.current?.(cur, max);
          await fetchParticipantList();
        }
      } catch (e) {
        setPollingActive(false); setIsConnected(false); setError('Connection failed');
      }
    }, 5000);
  }, [conversationId, fetchParticipantList, logger]);

  // ── Setup realtime subscription ────────────────────────────────────────────
  const setupEnhancedSubscription = useCallback(() => {
    if (!conversationId || !mountedRef.current || !enabled) return;

    cleanup();
    setError(null);

    // Stable topic — NO timestamp suffix
    const channelName = `enhanced-host-${conversationId}`;
    logger.category('admin', `Setting up enhanced host subscription: ${channelName}`);

    try {
      const channel = api
        .channel(channelName)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`
        }, (payload) => {
          if (!mountedRef.current) return;
          if (payload.new) {
            const cur     = payload.new.current_participants || 0;
            const max     = payload.new.participants || 0;
            const started = payload.new.session_started || false;
            setCurrentCount(cur);
            setMaxCount(max);
            setIsSessionStarted(started);
            onParticipantCountChangeRef.current?.(cur);
            onMaxParticipantsChangeRef.current?.(max);
            if (started) onSessionStartedRef.current?.();
            if (max > 0 && cur >= max && !started) onSessionFullRef.current?.(cur, max);
            fetchParticipantList();
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, () => {
          if (!mountedRef.current) return;
          fetchParticipantList();
        })
        .subscribe((status) => {
          if (!mountedRef.current) return;
          logger.category('admin', `Enhanced channel status: ${status}`);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setError(null);
            if (fallbackIntervalRef.current) {
              clearInterval(fallbackIntervalRef.current);
              fallbackIntervalRef.current = null;
              setPollingActive(false);
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setIsConnected(false);
            setError('Real-time connection failed, switching to polling...');
            startFastPolling();
            retryTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) setupEnhancedSubscription();
            }, 3000);
          } else if (status === 'CLOSED') {
            setIsConnected(false);
          }
        });

      channelRef.current = channel;
    } catch (e) {
      logger.category('admin', 'Error creating enhanced channel:', e);
      setError('Failed to establish enhanced connection');
      startFastPolling();
    }
  }, [conversationId, enabled, cleanup, fetchParticipantList, startFastPolling, logger]);

  // ── Initial data fetch ─────────────────────────────────────────────────────
  const fetchInitialData = useCallback(async () => {
    if (!conversationId || !enabled) return;
    try {
      const { data, error: err } = await api
        .from('conversations')
        .select('current_participants, participants, session_started')
        .eq('id', conversationId)
        .single();
      if (err) { logger.category('admin', 'Error fetching initial data:', err); return; }
      if (data) {
        const cur     = data.current_participants || 0;
        const max     = data.participants || 0;
        const started = data.session_started || false;
        setCurrentCount(cur);
        setMaxCount(max);
        setIsSessionStarted(started);
        onParticipantCountChangeRef.current?.(cur);
        onMaxParticipantsChangeRef.current?.(max);
        if (max > 0 && cur >= max && !started) onSessionFullRef.current?.(cur, max);
      }
      await fetchParticipantList();
    } catch (e) {
      logger.category('admin', 'Exception during initial data fetch:', e);
    }
  }, [conversationId, enabled, fetchParticipantList, logger]);

  // ── Mount / unmount — only re-runs when conversationId or enabled changes ──
  useEffect(() => {
    mountedRef.current = true;
    if (enabled && conversationId) {
      fetchInitialData();
      setupEnhancedSubscription();
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [conversationId, enabled]); // intentionally minimal — fns are stable

  const reconnect = useCallback(() => {
    setupEnhancedSubscription();
  }, [setupEnhancedSubscription]);

  return {
    isConnected,
    isDataLoaded,
    error,
    reconnect,
    participants,
    currentCount,
    maxCount,
    isSessionStarted,
    pollingActive,
    refresh: fetchInitialData
  };
}
