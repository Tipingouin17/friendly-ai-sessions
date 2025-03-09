
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";

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
          console.log("Checking if session is already started for conversation:", conversationId);
          const { data, error } = await supabase
            .from('conversations')
            .select('*')
            .eq('id', conversationId)
            .maybeSingle();
            
          if (error) {
            console.error("Error checking session_started:", error);
          } else if (data && 'session_started' in data && data.session_started) {
            console.log("Session is already marked as started in DB:", data);
            setIsSessionStarted(true);
            setShowQrCodeView(false);
          } else {
            console.log("Session not yet started in DB:", data);
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
      console.log("Setting showQrCodeView to false based on location state:", locationState);
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state]);
  
  const handleStartSession = async () => {
    console.log("Starting session for conversation:", conversationId);
    
    // First, update the local state to start showing the session UI
    setShowQrCodeView(false);
    setIsSessionStarted(true);
    
    // Then update the session_started flag in the database
    if (conversationId) {
      try {
        // Use type casting to handle the session_started field
        const updateData = { 
          session_started: true 
        } as Partial<ConversationWithSession>;
        
        const { error } = await supabase
          .from('conversations')
          .update(updateData)
          .eq('id', conversationId);
          
        if (error) {
          console.error("Error updating session_started:", error);
          toast({
            title: "Error starting session",
            description: "There was a problem starting the session. Please try again.",
            variant: "destructive",
          });
        } else {
          console.log("Successfully updated session_started in DB for conversation:", conversationId);
          toast({
            title: "Session started",
            description: "The session has been successfully started.",
          });
        }
      } catch (err) {
        console.error("Exception updating session_started:", err);
        toast({
          title: "Error starting session",
          description: "There was a problem starting the session. Please try again.",
          variant: "destructive",
        });
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
