
import React, { useEffect, useState, useRef } from "react";
import { SessionContextProps } from "@/types/session";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import AdminQrView from "./AdminQrView";
import ParticipantWaitingScreen from "./ParticipantWaitingScreen";
import SessionView from "./SessionView";
import { SessionStateProvider } from "@/contexts/SessionStateProvider";
import { useToast } from "@/components/ui/use-toast";
import JoinSessionLoadingState from "./JoinSessionLoadingState";

interface SessionStateHandlerProps {
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
}

const SessionStateHandler: React.FC<SessionStateHandlerProps> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}) => {
  const { toast } = useToast();
  const [initializing, setInitializing] = useState(true);
  const initializationTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  
  // Set up cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, []);
  
  // Update sessionStarted state based on DB status
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session started status from DB:", props.isSessionStartedInDB);
      setSessionStarted(true);
    }
  }, [props.isSessionStartedInDB, setSessionStarted]);
  
  // Initialization delay to ensure consistent behavior during initial load
  useEffect(() => {
    if (!mountedRef.current) return;
    
    // Give initialization a small delay to ensure all data is loaded
    if (initializing && props.conversation && props.currentConversationId) {
      initializationTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          console.log("Session state initialization complete");
          setInitializing(false);
        }
      }, 1000);
    }
    
    return () => {
      if (initializationTimerRef.current) {
        window.clearTimeout(initializationTimerRef.current);
      }
    };
  }, [initializing, props.conversation, props.currentConversationId]);

  // Connection recovery through refetching
  useEffect(() => {
    if (!mountedRef.current) return;
    
    const recoverInterval = setInterval(() => {
      if (props.conversation && props.currentConversationId && !props.isConnected) {
        console.log("Session state attempting recovery refetch");
        props.refetch();
      }
    }, 10000);
    
    return () => {
      clearInterval(recoverInterval);
    };
  }, [props.conversation, props.currentConversationId, props.isConnected, props.refetch]);

  // Handle connection status changes
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (props.isConnected && props.connectionAttempts > 0) {
      console.log("Connection restored after", props.connectionAttempts, "attempts");
      toast({
        title: "Connection Restored",
        description: "Successfully reconnected to the session.",
      });
    }
  }, [props.isConnected, props.connectionAttempts, toast]);

  // Safety check: If props.isLoading is true or required data is missing, show appropriate state
  if (props.isLoading || initializing) {
    console.log("Showing loading state - isLoading:", props.isLoading, "initializing:", initializing);
    return <LoadingState />;
  }
  
  // Error handling
  if (props.error) {
    console.log("Showing error state:", props.error);
    return (
      <JoinSessionLoadingState 
        error={props.error} 
        onRetry={() => props.refetch()}
        retryCount={props.connectionAttempts}
      />
    );
  }
  
  if (!props.conversation) {
    console.log("No conversation data, showing empty state");
    return <EmptyState />;
  }
  
  if (!props.currentConversationId) {
    console.log("No conversation ID, showing empty state");
    return <EmptyState />;
  }

  // Wrap everything in our state provider
  return (
    <SessionStateProvider 
      sessionData={props}
      isAdmin={isAdmin}
      onSessionFull={onSessionFull}
      onError={(error) => {
        console.error("Session error:", error);
        toast({
          title: "Session Error",
          description: error,
          variant: "destructive",
        });
      }}
    >
      <SessionStateContent
        props={props}
        isAdmin={isAdmin}
        sessionStarted={sessionStarted}
        setSessionStarted={setSessionStarted}
        onSessionFull={onSessionFull}
      />
    </SessionStateProvider>
  );
};

// Separate component to use the context
const SessionStateContent: React.FC<{
  props: SessionContextProps;
  isAdmin: boolean;
  sessionStarted: boolean;
  setSessionStarted: (started: boolean) => void;
  onSessionFull: () => void;
}> = ({
  props,
  isAdmin,
  sessionStarted,
  setSessionStarted,
  onSessionFull
}) => {
  const { toast } = useToast();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Handle state transitions with a delay to avoid flashing
  useEffect(() => {
    if (props.isSessionStartedInDB && !sessionStarted) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setSessionStarted(true);
        setIsTransitioning(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [props.isSessionStartedInDB, sessionStarted, setSessionStarted]);
  
  // Safety check for null values
  if (!props.conversation) {
    console.log("No conversation in SessionStateContent");
    return <EmptyState />;
  }

  // Calculate if session should be shown
  const maxParticipants = props.conversation?.participants || 0;
  const currentParticipants = props.conversation?.current_participants || 0;
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;
  const shouldShowSession = props.isSessionStartedInDB || sessionStarted || isSessionFull || isTransitioning;

  // Log session state for debugging
  console.log("Session state:", {
    shouldShowSession,
    isSessionStartedInDB: props.isSessionStartedInDB,
    sessionStarted,
    isSessionFull,
    isTransitioning,
    currentParticipants,
    maxParticipants,
    messageCount: props.sessionState.messages.length,
    participantsCount: props.participants.length,
    conversation: props.conversation ? "exists" : "missing",
    conversationId: props.currentConversationId
  });

  // Admin view gets QR code view for sharing until session is started
  if (isAdmin && !shouldShowSession && props.showQrCodeView) {
    console.log("Rendering AdminQrView");
    return (
      <AdminQrView
        conversationId={props.currentConversationId}
        currentParticipantCount={currentParticipants}
        maxParticipants={maxParticipants}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onStartSession={() => {
          console.log("Start session button clicked in AdminQrView");
          setIsTransitioning(true);
          
          try {
            props.handleStartSession();
            toast({
              title: "Starting session",
              description: "The session is now starting...",
            });
            
            // Set a timer to transition state
            setTimeout(() => {
              setSessionStarted(true);
              setIsTransitioning(false);
            }, 1000);
          } catch (error) {
            console.error("Error starting session:", error);
            setIsTransitioning(false);
            toast({
              title: "Error Starting Session",
              description: "There was a problem starting the session. Please try again.",
              variant: "destructive"
            });
          }
        }}
        onSessionFull={onSessionFull}
      />
    );
  }
  
  // For non-admins, show waiting screen until admin starts the session
  if (!isAdmin && !shouldShowSession) {
    console.log("Rendering ParticipantWaitingScreen");
    return (
      <ParticipantWaitingScreen
        conversationId={props.currentConversationId}
        currentParticipantCount={currentParticipants}
        maxParticipants={maxParticipants}
        facilitatorTitle={props.conversation.sessions?.facilitator_details?.title}
        onSessionStarted={() => {
          console.log("Session started callback from ParticipantWaitingScreen");
          setIsTransitioning(true);
          setTimeout(() => {
            setSessionStarted(true);
            setIsTransitioning(false);
          }, 500);
        }}
      />
    );
  }

  // Show loading if transitioning between states
  if (isTransitioning) {
    console.log("Showing transition loading state");
    return <LoadingState />;
  }

  // Show the main session view
  console.log("Rendering main SessionView");
  return <SessionView props={props} isAdmin={isAdmin} />;
};

export default SessionStateHandler;
