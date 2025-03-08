
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useSessionInterface(conversationId: number | null) {
  const [sessionLink, setSessionLink] = useState('');
  const [showQrCodeView, setShowQrCodeView] = useState(true);
  const location = useLocation();
  const isMobile = window.innerWidth < 768;
  
  // Generate session link when conversationId changes
  useEffect(() => {
    if (conversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
    }
  }, [conversationId]);
  
  // Determine if we should show QR code view based on device and user state
  useEffect(() => {
    const locationState = location.state as { isGuest?: boolean } | null;
    if (isMobile && locationState?.isGuest) {
      setShowQrCodeView(false);
    }
  }, [isMobile, location.state]);
  
  const handleStartSession = () => {
    setShowQrCodeView(false);
  };
  
  return {
    sessionLink,
    showQrCodeView,
    handleStartSession
  };
}
