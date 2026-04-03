/**
 * use Session Monitoring
 *
 * Hook for the AIfacilitator application.
 */

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
      
      // Only update state if different to prevent render loops
      if (isStarted !== isSessionStartedInDB) {
        setIsSessionStartedInDB(isStarted);
      }
    }
  }, [conversation, isSessionStartedInDB]);
  
  // Extract welcome message outside of roomState to prevent memoization issues
  const welcomeMessage = useMemo(() => 
    conversation?.sessions?.welcome_message || null,
    [conversation?.sessions?.welcome_message]
  );
  
  // Create roomState with proper parameters
  const roomState = useSessionRoomState({
    conversationId,
    conversation,
    currentUserParticipantId,
    participants,
    welcomeMessage,
    isAdmin: forceAdmin || isAdmin
  });
  
  return {
    isSessionStartedInDB,
    roomState
  };
};
