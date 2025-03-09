
import React, { useEffect, useState } from "react";
import { SessionProvider } from "@/components/session/SessionProvider";
import LoadingState from "@/components/session/LoadingState";
import EmptyState from "@/components/session/EmptyState";
import SessionContainer from "@/components/session/SessionContainer";
import QRCodeView from "@/components/session/QRCodeView";
import ParticipantWaitingScreen from "@/components/session/ParticipantWaitingScreen";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { useToast } from "@/components/ui/use-toast";
import { SessionContextProps } from "@/types/session";
import { useLocation } from "react-router-dom";

const Session = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Log initial state for debugging
  useEffect(() => {
    console.log("Session page loaded with state:", location.state);
  }, [location.state]);

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
    const adminStatus = Boolean(locationState?.isAdmin) || 
      (locationState?.isGuest !== true);
    
    setIsAdmin(adminStatus);
    console.log("Session page - isAdmin determined as:", adminStatus, "from state:", locationState);
  }, [location]);

  const handleSessionFull = () => {
    // Auto-start session when it's full
    setSessionStarted(true);
    
    toast({
      title: "Session is full",
      description: "The maximum number of participants has joined. Starting session automatically.",
    });
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    console.error("Session error:", errorMessage);
    
    toast({
      title: "Session Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  // Reset error state if we navigate away and back
  useEffect(() => {
    return () => {
      setError(null);
    };
  }, []);

  if (error) {
    return <JoinSessionLoadingState error={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <SessionProvider 
      handleSessionFull={handleSessionFull}
      onError={handleError}
    >
      {(props: SessionContextProps) => {
        // Log props for debugging
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          messagesCount: props.sessionState.messages.length,
          participantsCount: props.participants.length,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error
        });
        
        // Ensure we update the loading state from the provider
        useEffect(() => {
          setIsLoading(props.isLoading);
        }, [props.isLoading]);
        
        // Update sessionStarted state based on DB status
        useEffect(() => {
          if (props.isSessionStartedInDB) {
            console.log("Session started status from DB:", props.isSessionStartedInDB);
            setSessionStarted(true);
          }
        }, [props.isSessionStartedInDB]);
        
        // Handle errors from the session provider
        useEffect(() => {
          if (props.error) {
            handleError(props.error);
          }
        }, [props.error]);
        
        // If there's an error, return early
        if (props.error) {
          return <JoinSessionLoadingState error={props.error} onRetry={() => window.location.reload()} />;
        }
        
        if (props.isLoading) return <LoadingState />;
        if (!props.conversation || !props.currentConversationId) return <EmptyState />;

        // Check if we should automatically show session (all participants joined)
        const maxParticipants = props.conversation.participants || 0;
        const currentParticipants = props.conversation.current_participants || 0;
        const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
        
        // Calculate if session should be shown
        const shouldShowSession = props.isSessionStartedInDB || sessionStarted || isSessionFull;

        // Log session state for debugging
        console.log("Session state:", {
          shouldShowSession,
          isSessionStartedInDB: props.isSessionStartedInDB,
          sessionStarted,
          isSessionFull,
          currentParticipants,
          maxParticipants,
          messageCount: props.sessionState.messages.length
        });

        // Admin view gets QR code view for sharing until session is started
        if (isAdmin && !shouldShowSession && props.showQrCodeView) {
          return (
            <QRCodeView
              conversationId={props.currentConversationId}
              currentParticipantCount={props.conversation.current_participants || 0}
              maxParticipants={props.conversation.participants || 0}
              facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
              onStartSession={() => {
                props.handleStartSession();
                setSessionStarted(true);
              }}
              onSessionFull={handleSessionFull}
            />
          );
        }
        
        // For non-admins, show waiting screen until admin starts the session
        if (!isAdmin && !shouldShowSession) {
          return (
            <ParticipantWaitingScreen
              currentParticipantCount={props.conversation.current_participants || 0}
              maxParticipants={props.conversation.participants || 0}
              facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
            />
          );
        }

        // Set the appropriate viewMode based on user role
        if (isAdmin && props.sessionState.viewMode !== "admin") {
          props.sessionState.setViewMode("admin");
        } else if (!isAdmin && props.sessionState.viewMode !== "participant") {
          props.sessionState.setViewMode("participant");
        }

        return (
          <SessionContainer
            participantCount={props.conversation.participants || props.participants.length}
            conversation={props.conversation}
            messages={props.sessionState.messages}
            inputMessage={props.sessionState.inputMessage}
            setInputMessage={props.sessionState.setInputMessage}
            currentParticipant={props.sessionState.currentParticipant}
            onSendMessage={props.handleSendMessage}
            onLikeMessage={props.handleLikeMessage}
            isWaitingForResponse={props.isWaitingForResponse}
            onGenerateReport={props.sessionState.handleGenerateReport}
            isGeneratingReport={props.sessionState.isGeneratingReport}
            setIsRecording={props.sessionState.setIsRecording}
            isRecording={props.sessionState.isRecording}
            participantColors={props.participantColors}
            participantNames={{}}
            participants={props.participants}
            conversationId={props.currentConversationId}
            facilitator={props.conversation.sessions?.facilitator_details || {}}
            objective={props.conversation.sessions?.objective || ''}
            currentParticipantCount={props.conversation.current_participants || 0}
            currentUserParticipantId={props.currentUserParticipantId}
            hasAnswered={props.sessionState.hasAnswered}
            totalResponses={props.sessionState.totalResponses}
            viewMode={props.sessionState.viewMode}
            setViewMode={props.sessionState.setViewMode}
            isAdmin={isAdmin}
          />
        );
      }}
    </SessionProvider>
  );
};

export default Session;
