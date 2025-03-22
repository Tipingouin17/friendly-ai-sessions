
import { useState, useEffect, useRef } from "react";
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
  forceAdmin?: boolean;
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
  const adminStatusSetRef = useRef(false);
  
  // Enforce admin status if forceAdmin is true - wrapped in useEffect to prevent render loops
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      console.log("useSessionMonitoring: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
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
