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

  // Sync session_started from conversation data
  useEffect(() => {
    if (!conversation) return;
    const started = (conversation as any).session_started === true;
    if (started && !lastSessionStarted.current) {
      lastSessionStarted.current = true;
      setIsSessionStarted(true);
      setShowQrCodeView(false);
    } else if (!started && !lastSessionStarted.current) {
      setIsSessionStarted(false);
      setShowQrCodeView(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
  }, [(conversation as any)?.session_started]);

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
          payload.old?.session_started !== payload.new.session_started &&
          payload.new.session_started === true
        ) {
          if (!lastSessionStarted.current) {
            lastSessionStarted.current = true;
            setIsSessionStarted(true);
            setShowQrCodeView(false);
            toast({
              title: "Session Started",
              description: "The session has been automatically started.",
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
      const { error } = await api
        .from('conversations')
        .update({ session_started: true })
        .eq('id', conversationId);

      if (error) {
        toast({
          title: "Error starting session",
          description: "There was a problem starting the session. Please try again.",
          variant: "destructive",
        });
      } else {
        setIsSessionStarted(true);
        setShowQrCodeView(false);
        lastSessionStarted.current = true;
        toast({
          title: "Session started",
          description: "The session has been successfully started.",
        });
        await navigateToHostSession(conversationId);
      }
    } catch (err) {
      toast({
        title: "Error starting session",
        description: "There was a problem starting the session. Please try again.",
        variant: "destructive",
      });
    }
  };

  return {
    sessionLink,
    showQrCodeView,
    isSessionStarted,
    handleStartSession
  };
}
