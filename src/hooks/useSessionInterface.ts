
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useSessionInterface(conversationId: number | null) {
  const [sessionLink, setSessionLink] = useState('');
  const [showQrCodeView, setShowQrCodeView] = useState(true);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const location = useLocation();
  const isMobile = window.innerWidth < 768;
  
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
            .select('*')
            .eq('id', conversationId)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking session_started:", error);
          } else if (data && 'session_started' in data && data.session_started) {
            console.log("Session is already marked as started in DB");
            setIsSessionStarted(true);
            setShowQrCodeView(false);
          }
        } catch (err) {
          console.error("Exception checking session_started:", err);
        }
      };
      
      checkSessionStarted();
    }
  }, [conversationId]);
  
  // Determine if we should show QR code view based on device and user state
  useEffect(() => {
    const locationState = location.state as { isGuest?: boolean; showMessaging?: boolean } | null;
    if ((isMobile && locationState?.isGuest) || locationState?.showMessaging === true) {
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state]);
  
  const handleStartSession = async () => {
    setShowQrCodeView(false);
    setIsSessionStarted(true);
    
    // Update the session_started flag in the database when admin starts session
    if (conversationId) {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ 
            session_started: true 
          } as any) // Use 'as any' to bypass TypeScript checking temporarily
          .eq('id', conversationId);
          
        if (error) {
          console.error("Error updating session_started:", error);
        }
      } catch (err) {
        console.error("Exception updating session_started:", err);
      }
    }
  };
  
  return {
    sessionLink,
    showQrCodeView,
    isSessionStarted,
    handleStartSession
  };
}
