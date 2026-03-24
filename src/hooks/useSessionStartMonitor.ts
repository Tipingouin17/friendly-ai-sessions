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
      // Check if the session is already started in the DB
      const isStarted = Boolean(conversation.session_started);
      setIsSessionStartedInDB(isStarted);
    }
  }, [conversation]);
  
  return isSessionStartedInDB;
};
