import { useState, useEffect } from "react";
import { useSessionRoomState } from "@/hooks/useSessionRoomState";
import { ConversationWithSession } from "@/types/database";
import { ParticipantInfo } from "@/types/chat";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

type UseSessionMonitoringProps = {
  conversation: ConversationWithSession | null;
  conversationId: number | null;
  currentUserParticipantId: number | null;
  participants: ParticipantInfo[];
  onError?: (error: string) => void;
  forceAdmin?: boolean; // Added forceAdmin prop
};

export const useSessionMonitoring = ({
  conversation,
  conversationId,
  currentUserParticipantId,
  participants,
  onError,
  forceAdmin
}: UseSessionMonitoringProps) => {
  const { isAdmin, setAdminStatus } = useSessionAdminStatus();
  const [isSessionStartedInDB, setIsSessionStartedInDB] = useState(false);
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin) {
      console.log("useSessionMonitoring: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Monitor session start status - fixed to pass the conversation object
  useEffect(() => {
    if (conversation) {
      // Check if the session is already started in the DB
      const isStarted = Boolean(conversation.session_started);
      console.log("Session started status from conversation:", isStarted);
      setIsSessionStartedInDB(isStarted);
    }
  }, [conversation]);
  
  // Get room state - fixed to include isAdmin prop properly
  const roomState = useSessionRoomState({
    conversationId,
    conversation,
    currentUserParticipantId,
    participants,
    welcomeMessage: conversation?.sessions?.welcome_message || null,
    isAdmin: forceAdmin || isAdmin
  });
  
  return {
    isSessionStartedInDB,
    roomState
  };
};
