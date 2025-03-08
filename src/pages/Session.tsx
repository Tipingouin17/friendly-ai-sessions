
import React, { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session/SessionProvider";
import LoadingState from "@/components/session/LoadingState";
import EmptyState from "@/components/session/EmptyState";
import SessionContainer from "@/components/session/SessionContainer";
import QRCodeView from "@/components/session/QRCodeView";
import ParticipantWaitingScreen from "@/components/session/ParticipantWaitingScreen";
import { useToast } from "@/components/ui/use-toast";
import { SessionContextProps } from "@/types/session";
import { useLocation } from "react-router-dom";

const Session = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // Determine if user is admin based on location state
  useEffect(() => {
    const locationState = location.state as { 
      isGuest?: boolean; 
      showMessaging?: boolean;
      isAdmin?: boolean;
    } | null;
    
    // User is considered admin if:
    // 1. They're explicitly marked as admin in the state
    // 2. They're not a guest (implying they created the session)
    // 3. They're not accessing via the join flow
    setIsAdmin(
      Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true)
    );
  }, [location]);

  const handleSessionFull = () => {
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  };

  return (
    <SessionProvider handleSessionFull={handleSessionFull}>
      {(props: SessionContextProps) => {
        const {
          isLoading,
          conversation,
          currentConversationId,
          sessionState,
          anonymousState,
          participants,
          participantColors,
          isWaitingForResponse,
          handleStartSession,
          handleSendMessage,
          handleLikeMessage,
          showQrCodeView,
          currentUserParticipantId
        } = props;

        if (isLoading) return <LoadingState />;
        if (!conversation || !currentConversationId) return <EmptyState />;

        const isMobile = window.innerWidth < 768;
        const locationState = location.state as { isGuest?: boolean; showMessaging?: boolean } | null;
        
        // Check if we should automatically show session (all participants joined)
        const maxParticipants = conversation.participants || 0;
        const currentParticipants = conversation.current_participants || 0;
        const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
        
        // Admin view gets QR code view for sharing
        if (isAdmin && !sessionStarted && !showQrCodeView) {
          // This is when admin is viewing the session but hasn't started it
          setSessionStarted(true);
        }

        // Admin gets QR code view until they start the session
        if (isAdmin && showQrCodeView) {
          return (
            <QRCodeView
              conversationId={currentConversationId}
              currentParticipantCount={conversation.current_participants || 0}
              maxParticipants={conversation.participants || 0}
              facilitatorTitle={conversation.sessions?.facilitator_details?.title}
              onStartSession={() => {
                handleStartSession();
                setSessionStarted(true);
              }}
              onSessionFull={handleSessionFull}
            />
          );
        }
        
        // Update the condition to check if session should be shown
        const shouldShowSession = (isAdmin && sessionStarted) || 
          (!isAdmin && !showQrCodeView) || 
          (isMobile && locationState?.isGuest) || 
          locationState?.showMessaging === true ||
          isSessionFull;

        // For non-admins, show waiting screen until admin starts the session
        // or other conditions to show the session are met
        if (!isAdmin && !shouldShowSession) {
          return (
            <ParticipantWaitingScreen
              currentParticipantCount={conversation.current_participants || 0}
              maxParticipants={conversation.participants || 0}
              facilitatorTitle={conversation.sessions?.facilitator_details?.title}
            />
          );
        }

        return (
          <SessionContainer
            participantCount={conversation.participants || participants.length}
            conversation={conversation}
            messages={sessionState.messages}
            inputMessage={sessionState.inputMessage}
            setInputMessage={sessionState.setInputMessage}
            currentParticipant={sessionState.currentParticipant}
            onSendMessage={handleSendMessage}
            onLikeMessage={handleLikeMessage}
            isWaitingForResponse={isWaitingForResponse}
            onGenerateReport={sessionState.handleGenerateReport}
            isGeneratingReport={sessionState.isGeneratingReport}
            setIsRecording={sessionState.setIsRecording}
            isRecording={sessionState.isRecording}
            participantColors={participantColors}
            participantNames={{}}
            participants={participants}
            conversationId={currentConversationId}
            facilitator={conversation.sessions?.facilitator_details || {}}
            objective={conversation.sessions?.objective || ''}
            currentParticipantCount={conversation.current_participants || 0}
            currentUserParticipantId={currentUserParticipantId}
            hasAnswered={sessionState.hasAnswered}
            totalResponses={sessionState.totalResponses}
            viewMode={sessionState.viewMode}
            setViewMode={sessionState.setViewMode}
            isAdmin={isAdmin}
          />
        );
      }}
    </SessionProvider>
  );
};

export default Session;
