
import { useState, useEffect } from "react";
import { ConversationWithSession } from "@/types/database";

interface UseSessionStartMonitorProps {
  conversation: ConversationWithSession | null;
}

export const useSessionStartMonitor = ({ conversation }: UseSessionStartMonitorProps) => {
  const [isSessionStartedInDB, setIsSessionStartedInDB] = useState(false);
  
  useEffect(() => {
    if (conversation?.session_started) {
      console.log("Session is marked as started in DB:", conversation.session_started);
      setIsSessionStartedInDB(true);
    } else {
      console.log("Session not marked as started in DB:", conversation);
    }
  }, [conversation]);
  
  return isSessionStartedInDB;
};
