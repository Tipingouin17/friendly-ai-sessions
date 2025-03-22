
import { useState, useEffect, useRef, useMemo } from "react";
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
  const hasMonitoredSessionRef = useRef(false);
  const prevConversationRef = useRef<ConversationWithSession | null>(null);
  
  // Enforce admin status if forceAdmin is true - wrapped in useEffect to prevent render loops
  useEffect(() => {
    if (forceAdmin && !adminStatusSetRef.current) {
      console.log("useSessionMonitoring: Enforcing admin status with forceAdmin=true");
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      adminStatusSetRef.current = true;
    }
  }, [forceAdmin, setAdminStatus]);
  
  // Monitor session start status - only update when conversation changes
  useEffect(() => {
    // Skip if this is the same conversation object or we've already monitored it
    if (conversation === prevConversationRef.current || 
        (!conversation && hasMonitoredSessionRef.current)) {
      return;
    }
    
    prevConversationRef.current = conversation;
    
    if (conversation) {
      hasMonitoredSessionRef.current = true;
      
      // Check if the session is already started in the DB
      const isStarted = Boolean(conversation.session_started);
      console.log("Session started status from conversation:", isStarted);
      
      // Only update state if different to prevent render loops
      if (isStarted !== isSessionStartedInDB) {
        setIsSessionStartedInDB(isStarted);
      }
    }
  }, [conversation, isSessionStartedInDB]);
  
  // Use memoized room state to prevent unnecessary re-renders
  const roomState = useMemo(() => 
    useSessionRoomState({
      conversationId,
      conversation,
      currentUserParticipantId,
      participants,
      welcomeMessage: conversation?.sessions?.welcome_message || null,
      isAdmin: forceAdmin || isAdmin
    }),
    [
      conversationId,
      conversation,
      currentUserParticipantId,
      participants,
      forceAdmin,
      isAdmin,
      // Specifically don't include conversation.sessions?.welcome_message to reduce re-renders
    ]
  );
  
  return {
    isSessionStartedInDB,
    roomState
  };
};
