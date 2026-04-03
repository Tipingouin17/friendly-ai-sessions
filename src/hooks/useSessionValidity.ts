/**
 * use Session Validity
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useConversationId } from "./useConversationId";

export function useSessionValidity() {
  const { currentConversationId } = useConversationId();
  const location = useLocation();
  const [noSessionFound, setNoSessionFound] = useState<boolean>(false);

  // Check if session ID exists
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get('id');
    
    if (!sessionId && !location.state && !currentConversationId) {
      setNoSessionFound(true);
    }
  }, [location, currentConversationId]);

  return { noSessionFound, currentConversationId };
}
