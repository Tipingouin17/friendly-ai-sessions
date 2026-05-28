/**
 * use Session Interface
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

const hasStartedSession = (conversationLike: any): boolean => {
  return conversationLike?.session_started === true || Boolean(conversationLike?.session_started_at);
};

const isMissingSessionStartedAtColumn = (error: { message?: string; details?: string; hint?: string; code?: string } | null): boolean => {
  if (!error) return false;
  const combined = [error.message, error.details, error.hint, error.code].filter(Boolean).join(' ').toLowerCase();
  return combined.includes('session_started_at') && (combined.includes('column') || combined.includes('does not exist'));
};

const verifyPersistedSessionStart = async (conversationId: number): Promise<boolean> => {
  let { data, error } = await api
    .from('conversations')
    .select('id,session_started,session_started_at')
    .eq('id', conversationId)
    .single();

  if (isMissingSessionStartedAtColumn(error)) {
    ({ data, error } = await api
      .from('conversations')
      .select('id,session_started')
      .eq('id', conversationId)
      .single());
  }

  if (error) {
    throw new Error(error.message || 'Unable to verify that the session started');
  }

  return hasStartedSession(data);
};

export function useSessionInterface(
  conversationId: number | null,
  conversation?: ConversationWithSession | null
) {
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [showQrCodeView, setShowQrCodeView] = useState(true);
  const { toast } = useToast();
  const location = useLocation();
  const { navigateToHostSession } = useSecureNavigation();
  const isMobile = window.innerWidth < 768;

  // Real-time subscription refs
  const channelRef = useRef<any>(null);
  const lastSessionStarted = useRef<boolean>(false);

  // Derive session link directly from conversation data — no network call needed
  const sessionLink = useMemo(() => {
    if (!conversationId) return '';
    const baseUrl = window.location.origin;
    const token = (conversation as any)?.join_token;
    return token
      ? `${baseUrl}/join-session?id=${conversationId}&token=${encodeURIComponent(token)}`
      : `${baseUrl}/join-session?id=${conversationId}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [conversationId, (conversation as any)?.join_token]);

  // Sync persisted starts from conversation data. Newer backends include
  // session_started_at, but older deployments only have session_started; both
  // must be accepted so the host and participants are not stranded in waiting room.
  useEffect(() => {
    if (!conversation) return;
    const started = hasStartedSession(conversation as any);
    if (started && !lastSessionStarted.current) {
      lastSessionStarted.current = true;
      setIsSessionStarted(true);
      setShowQrCodeView(false);
    } else if (!started && !lastSessionStarted.current) {
      setIsSessionStarted(false);
      setShowQrCodeView(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [(conversation as any)?.session_started, (conversation as any)?.session_started_at]);

  // Set up real-time subscription for session_started updates
  useEffect(() => {
    if (!conversationId) return;

    // Clean up any existing channel
    if (channelRef.current) {
      api.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = api
      .channel(`session-interface-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        if (
          payload.new &&
          (
            payload.old?.session_started !== payload.new.session_started ||
            payload.old?.session_started_at !== payload.new.session_started_at
          ) &&
          hasStartedSession(payload.new as any)
        ) {
          if (!lastSessionStarted.current) {
            lastSessionStarted.current = true;
            setIsSessionStarted(true);
            setShowQrCodeView(false);
            toast({
              title: "Session Started",
              description: "The host has started the session.",
            });
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        api.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, toast]);

  // Determine if we should show QR code view based on device and user state
  useEffect(() => {
    const locationState = location.state as { isGuest?: boolean; showMessaging?: boolean } | null;
    const isAdminPage = location.pathname.includes('/admin');
    if (!isAdminPage && (isMobile && locationState?.isGuest) || locationState?.showMessaging === true) {
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state, location.pathname]);

  const handleStartSession = async () => {
    if (!conversationId) {
      toast({
        title: "Error starting session",
        description: "No conversation ID found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    sessionStorage.setItem('isHostSession', 'true');

    try {
      const startedAt = new Date().toISOString();
      let { error } = await api
        .from('conversations')
        .update({
          session_started: true,
          session_started_at: startedAt,
        })
        .eq('id', conversationId);

      if (isMissingSessionStartedAtColumn(error)) {
        console.warn('session_started_at column is unavailable; falling back to session_started only.');
        ({ error } = await api
          .from('conversations')
          .update({
            session_started: true,
          })
          .eq('id', conversationId));
      }

      if (error) {
        throw new Error(error.message || "Failed to start session");
      }

      const persistedStartConfirmed = await verifyPersistedSessionStart(conversationId);
      if (!persistedStartConfirmed) {
        throw new Error("Session start was not persisted by the backend");
      }

      setIsSessionStarted(true);
      setShowQrCodeView(false);
      lastSessionStarted.current = true;
      toast({
        title: "Session started",
        description: "The session has been successfully started.",
      });
      await navigateToHostSession(conversationId);
    } catch (err) {
      toast({
        title: "Error starting session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    sessionLink,
    showQrCodeView,
    isSessionStarted,
    handleStartSession
  };
}
