/**
 * use Session Start Monitor
 *
 * Hook for the AIfacilitator application.
 */
import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";

interface UseSessionStartMonitorProps {
  conversation: ConversationWithSession | null;
}

export const useSessionStartMonitor = ({ 
  conversation 
}: UseSessionStartMonitorProps) => {
  const [isSessionStartedInDB, setIsSessionStartedInDB] = useState(false);
  
  useEffect(() => {
    if (conversation) {
      // Check if the session was started in the DB. Newer schemas may also
      // include session_started_at, but session_started is the cross-deployment flag.
      const isStarted = Boolean(conversation.session_started);
      setIsSessionStartedInDB(isStarted);
    }
  }, [conversation]);
  
  return isSessionStartedInDB;
};
