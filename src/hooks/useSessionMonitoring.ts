
import { useState, useEffect } from "react";
import { useSessionRoomState } from "@/hooks/useSessionRoomState";
import { useSessionStartMonitor } from "@/hooks/useSessionStartMonitor";
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
  
  // Enforce admin status if forceAdmin is true
  useEffect(() => {
    if (forceAdmin) {
      console.log("useSessionMonitoring: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Monitor session start status
  const { isSessionStartedInDB } = useSessionStartMonitor(conversationId);
  
  // Get room state
  const roomState = useSessionRoomState({
    conversation,
    conversationId,
    currentUserParticipantId,
    participants,
    onError,
    isAdmin: forceAdmin ? true : isAdmin // Use forceAdmin to override isAdmin
  });
  
  return {
    isSessionStartedInDB,
    roomState
  };
};
