/**
 * use Loading Error Handling
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect } from 'react';

export function useLoadingErrorHandling(error?: string | null, retryCount?: number) {
  const [errorDescription, setErrorDescription] = useState<string | null>(null);

  useEffect(() => {
    if (!error) {
      setErrorDescription(null);
      return;
    }
    
    if (error.includes("Permission denied") || error.includes("nodeType")) {
      setErrorDescription("There was a problem with browser permissions. This might be resolved by reloading the page.");
    } else if (error.includes("network") || error.includes("connection") || error.includes("timeout")) {
      setErrorDescription("There seems to be a network connectivity issue. Please check your internet connection.");
    } else if (error.includes("JSON") || error.includes("parse") || error.includes("no rows")) {
      setErrorDescription("The session data couldn't be loaded properly. Please try again.");
    } else if (error.includes("websocket") || error.includes("WebSocket")) {
      setErrorDescription("We're having trouble establishing a real-time connection. This might be due to network restrictions.");
    } else if (error.includes("full") || error.includes("maximum capacity")) {
      setErrorDescription("This session has reached its maximum capacity and cannot accept more participants. Please try again later or contact the session organizer.");
    } else {
      setErrorDescription(error);
    }
  }, [error, retryCount]);

  return { errorDescription };
}
