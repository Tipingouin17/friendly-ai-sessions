
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useSecureNavigation } from "@/hooks/useSecureNavigation";

export function useSessionInterface(conversationId: number | null) {
  const [sessionLink, setSessionLink] = useState('');
  const [showQrCodeView, setShowQrCodeView] = useState(true);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const { navigateToHostSession } = useSecureNavigation();
  const isMobile = window.innerWidth < 768;
  
  // Real-time subscription refs
  const channelRef = useRef<any>(null);
  const lastSessionStarted = useRef<boolean>(false);
  
  // Generate session link when conversationId changes
  useEffect(() => {
    if (conversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
      
      // Check if session is already marked as started in the database
      const checkSessionStarted = async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('session_started')
            .eq('id', conversationId)
            .maybeSingle();
            
          if (error) {
            console.error("❌ [useSessionInterface] Error checking session_started:", error);
          } else if (data && data.session_started) {
            setIsSessionStarted(true);
            setShowQrCodeView(false);
            lastSessionStarted.current = true;
          } else {
            setShowQrCodeView(true);
            setIsSessionStarted(false);
            lastSessionStarted.current = false;
          }
        } catch (err) {
          console.error("💥 [useSessionInterface] Exception checking session_started:", err);
        }
      };
      
      checkSessionStarted();
    }
  }, [conversationId]);

  // Set up real-time subscription for session_started updates
  useEffect(() => {
    if (!conversationId) return;

    // Clean up any existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new channel for this conversation
    const channel = supabase
      .channel(`session-interface-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        
        // Check if session_started field changed
        if (payload.new && 
            payload.old?.session_started !== payload.new.session_started &&
            payload.new.session_started === true) {
          
          // Prevent duplicate processing
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
      .subscribe((status) => { /* no-op */ });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, toast]);
  
  // Determine if we should show QR code view based on device and user state
  useEffect(() => {
    const locationState = location.state as { isGuest?: boolean; showMessaging?: boolean } | null;
    
    // Admin pages should never hide QR code view based on mobile status
    const isAdminPage = location.pathname.includes('/admin');
    
    if (!isAdminPage && (isMobile && locationState?.isGuest) || locationState?.showMessaging === true) {
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state, location.pathname]);
  
  const handleStartSession = async () => {
    
    if (!conversationId) {
      console.error("❌ [useSessionInterface] Cannot start session: No conversation ID provided");
      toast({
        title: "Error starting session",
        description: "No conversation ID found. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    // Always ensure host status is preserved
    sessionStorage.setItem('isHostSession', 'true');
    
    try {
      // Update the session_started flag in the database
      const { error } = await supabase
        .from('conversations')
        .update({ 
          session_started: true 
        })
        .eq('id', conversationId);
        
      if (error) {
        console.error("❌ [useSessionInterface] Error updating session_started:", error);
        toast({
          title: "Error starting session",
          description: "There was a problem starting the session. Please try again.",
          variant: "destructive",
        });
      } else {
        
        // Update local state immediately (real-time will confirm)
        setIsSessionStarted(true);
        setShowQrCodeView(false);
        lastSessionStarted.current = true;
        
        toast({
          title: "Session started",
          description: "The session has been successfully started.",
        });
        
        // Use secure navigation for host redirect
        await navigateToHostSession(conversationId);
      }
    } catch (err) {
      console.error("💥 [useSessionInterface] Exception updating session_started:", err);
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
