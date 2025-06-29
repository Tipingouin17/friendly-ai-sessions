
import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import HostHeader from "./HostHeader";
import HostSessionContent from "./HostSessionContent";
import HostQrDialog from "./HostQrDialog";
import HostWrapUpDialog from "./HostWrapUpDialog";
import { Message } from "@/types/chat";
import { useSessionClosure } from "@/hooks/useSessionClosure";

interface HostDashboardProps {
  conversation: any;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  participants: any[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage: (content: string) => Promise<void>;
  isWaitingForResponses: boolean;
  responseCount: number;
  totalParticipants: number;
  onTriggerFacilitatorResponse: () => Promise<void>;
  isSessionStarted: boolean;
  onSessionStarted: () => Promise<void>;
  triggerSessionStart?: () => Promise<boolean>;
  sessionStartNotification?: string | null;
  isStartingSession?: boolean;
  startProgress?: string;
  responseProgress?: {
    collected: number;
    total: number;
    isComplete: boolean;
  } | null;
}

const HostDashboard: React.FC<HostDashboardProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  sessionMessages,
  participantColors,
  participants,
  isLoadingParticipants,
  currentConversationId,
  onSendMessage,
  isWaitingForResponses,
  responseCount,
  totalParticipants,
  onTriggerFacilitatorResponse,
  isSessionStarted,
  onSessionStarted,
  triggerSessionStart,
  sessionStartNotification,
  isStartingSession = false,
  startProgress = '',
  responseProgress
}) => {
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showWrapUpDialog, setWrapUpDialog] = useState(false);

  // Fetch active sessions for dropdown
  const { data: sessions = [] } = useQuery({
    queryKey: ['host-sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          created_at,
          participants,
          current_participants,
          session_started,
          is_session_ended,
          sessions (
            title,
            facilitator_details:facilitators (
              title,
              profile_picture
            )
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  // Session closure hook
  const { 
    closeSession, 
    isClosing, 
    downloadReport, 
    isDownloading 
  } = useSessionClosure({
    conversationId: currentConversationId,
    onSuccess: () => {
      setWrapUpDialog(false);
    }
  });

  const handleShowQrCode = useCallback(() => {
    setShowQrDialog(true);
  }, []);

  const handleCloseQrDialog = useCallback(() => {
    setShowQrDialog(false);
  }, []);

  const handleWrapUpSession = useCallback(() => {
    setWrapUpDialog(true);
  }, []);

  const handleCloseWrapUpDialog = useCallback(() => {
    setWrapUpDialog(false);
  }, []);

  if (!currentConversationId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Session Selected</h2>
          <p className="text-gray-600">Please select or create a session to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <HostHeader
        currentConversationId={currentConversationId}
        conversation={conversation}
        activeSessions={sessions}
        participants={participants}
        isLoadingParticipants={isLoadingParticipants}
        onShowQrCode={handleShowQrCode}
        onWrapUpSession={handleWrapUpSession}
        isSessionStarted={isSessionStarted}
        onSessionStarted={onSessionStarted}
        triggerSessionStart={triggerSessionStart}
        sessionStartNotification={sessionStartNotification}
        isStartingSession={isStartingSession}
        startProgress={startProgress}
      />

      <HostSessionContent
        conversationData={conversation}
        isSessionPaused={isSessionPaused}
        toggleSessionState={toggleSessionState}
        sessionMessages={sessionMessages}
        participantColors={participantColors}
        participants={participants}
        currentConversationId={currentConversationId}
        onSendMessage={onSendMessage}
        isWaitingForResponses={isWaitingForResponses}
        responseCount={responseCount}
        totalParticipants={totalParticipants}
        onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
        isSessionStarted={isSessionStarted}
        responseProgress={responseProgress}
      />

      {showQrDialog && (
        <HostQrDialog
          conversationId={currentConversationId}
        />
      )}

      {showWrapUpDialog && (
        <HostWrapUpDialog
          onWrapUp={closeSession}
          isWrappingUp={isClosing}
        />
      )}
    </div>
  );
};

export default HostDashboard;
