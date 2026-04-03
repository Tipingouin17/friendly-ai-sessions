/**
 * use Session Container State
 *
 * Hook for the AIfacilitator application.
 */

import { useState } from 'react';
import { useSessionContainer } from "@/hooks/useSessionContainer";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { useMessageProcessor } from "@/hooks/useMessageProcessor";

interface UseSessionContainerStateProps {
  conversationId: number | null;
  currentUserParticipantId: number | null;
  canGenerateReports: boolean;
  onGenerateReport?: () => void;
  messages: any[];
  viewMode: "participant" | "admin";
  participants: any[];
  participantNames?: { [key: number]: string };
  currentParticipant: number;
}

export const useSessionContainerState = ({
  conversationId,
  currentUserParticipantId,
  canGenerateReports,
  onGenerateReport,
  messages,
  viewMode,
  participants,
  participantNames = { /* no-op */ },
  currentParticipant
}: UseSessionContainerStateProps) => {
  const [adminNotification, setAdminNotification] = useState<string | null>(null);
  
  const {
    isMobile,
    joinUrl,
    isQrDialogOpen,
    setIsQrDialogOpen,
    handleGenerateReport
  } = useSessionContainer({
    canGenerateReports,
    onGenerateReport,
    conversationId
  });
  
  const { isAnonymous, toggleAnonymous } = useAnonymousState({
    conversationId,
    currentParticipantId: currentUserParticipantId
  });
  
  const processedMessages = useMessageProcessor({
    messages,
    viewMode,
    participants,
    participantNames,
    currentParticipant
  });

  return {
    adminNotification,
    setAdminNotification,
    isMobile,
    joinUrl,
    isQrDialogOpen,
    setIsQrDialogOpen,
    handleGenerateReport,
    isAnonymous,
    toggleAnonymous,
    processedMessages
  };
};
