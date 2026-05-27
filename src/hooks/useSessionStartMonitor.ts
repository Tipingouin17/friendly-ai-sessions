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
      // Check if the session was explicitly started by the host in the DB.
      const isStarted = Boolean(conversation.session_started && (conversation as any).session_started_at);
      setIsSessionStartedInDB(isStarted);
    }
  }, [conversation]);
  
  return isSessionStartedInDB;
};
