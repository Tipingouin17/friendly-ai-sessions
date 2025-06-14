
import React, { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import { useAdminStatusPersistence } from "@/hooks/useAdminStatusPersistence";
import { useAdminSessionLoader } from "@/hooks/useAdminSessionLoader";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import SimplifiedAdminHeader from "@/components/session/admin/SimplifiedAdminHeader";
import SimplifiedAdminMessagingView from "@/components/session/messaging/SimplifiedAdminMessagingView";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import ParticipantMessagingView from "@/components/session/messaging/ParticipantMessagingView";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";
import { useCurrentParticipant } from "@/hooks/useCurrentParticipant";
import { useAnonymousState } from "@/hooks/useAnonymousState";
import { Message } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { getParticipantColor } from "@/utils/sessionHelpers";

const SessionAdmin = () => {
  // Enforce admin status
  const { forceAdmin } = useAdminStatusPersistence();
  const initialRenderRef = useRef(true);
  const { toast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();

  // Session page state
  const {
    isLoading: sessionPageLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    handleError,
    handleSessionFull,
    retryConnection
  } = useSessionPage();
  
  // Admin session loader
  const {
    isLoading: loaderIsLoading,
    hasInitializedProvider,
    setHasInitializedProvider,
    setIsLoading,
    conversationData,
    isConversationLoading,
    currentConversationId,
    locationState,
    adminViewMounted
  } = useAdminSessionLoader();
  
  // Track URL params for session switching
  useEffect(() => {
    console.log("Location or conversation ID changed in SessionAdmin");
    setHasInitializedProvider(false);
    setIsLoading(true);
    sessionStorage.setItem('isAdminSession', 'true');
  }, [location.search, location.pathname, setHasInitializedProvider, setIsLoading]);
  
  // Set admin status in session storage immediately
  useEffect(() => {
    sessionStorage.setItem('isAdminSession', 'true');
    console.log("Admin session confirmed on mount");
  }, []);
  
  // Participant tracking
  const {
    participants = [],
    setParticipants,
    isLoading: isLoadingParticipants
  } = useParticipantTracking(locationState, conversationData, currentConversationId);
  
  // Initialize session messages with empty array
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  
  // Admin message handling
  const {
    isSessionPaused,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage
  } = useAdminMessages({
    conversationId: currentConversationId,
    participants: participants || [],
    messages: sessionMessages || [],
    setMessages: setSessionMessages
  });

  // Participant state for message sending
  const [inputMessage, setInputMessage] = useState('');
  const currentParticipant = useCurrentParticipant({
    locationState,
    conversation: conversationData
  });
  const { isAnonymous, toggleAnonymous } = useAnonymousState();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [totalResponses, setTotalResponses] = useState(0);
  const [participantResponses, setParticipantResponses] = useState<{ [key: number]: boolean }>({});

  const recordResponse = (participantId: number, hasResponded: boolean) => {
    setParticipantResponses(prev => {
      const updated = { ...prev, [participantId]: hasResponded };
      const newTotal = Object.values(updated).filter(Boolean).length;
      setTotalResponses(newTotal);
      if (participantId === currentParticipant) {
        setHasAnswered(hasResponded);
      }
      return updated;
    });
  };

  // Session state for participant interactions
  const sessionState = {
    messages: sessionMessages,
    setMessages: setSessionMessages,
    inputMessage,
    setInputMessage,
    currentParticipant: currentParticipant || 1,
    isRecording: false,
    setIsRecording: () => {},
    handleGenerateReport: async () => {},
    isGeneratingReport: false,
    hasAnswered,
    totalResponses,
    viewMode: "admin" as const,
    setViewMode: () => {},
    recordResponse,
    error: null
  };

  // Set up session interactions for participant message sending
  const {
    isWaitingForResponse,
    handleSendMessage,
    error: interactionError
  } = useSessionInteractions({
    currentConversationId,
    sessionState,
    conversation: conversationData,
    participants,
    isAnonymous
  });
  
  // Keep a state reference to preserve UI data
  const [adminViewReady, setAdminViewReady] = useState(false);
  
  // Calculate effective loading state
  const isLoading = (sessionPageLoading || loaderIsLoading || isConversationLoading) && !adminViewReady;
  
  // Force admin view to stay ready once it's been loaded
  useEffect(() => {
    if (!isLoading && (conversationData || adminViewMounted) && !adminViewReady) {
      setAdminViewReady(true);
    }
    
    const readyTimeout = setTimeout(() => {
      if (!adminViewReady) {
        console.log("Forcing admin view ready after timeout");
        setAdminViewReady(true);
      }
    }, 2000);
    
    return () => clearTimeout(readyTimeout);
  }, [isLoading, conversationData, adminViewReady, adminViewMounted]);
  
  // Log status on mount
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      console.log("Admin session page mounted", {
        time: new Date().toISOString(),
        isAdmin: true,
        isLoading,
        currentConversationId,
        locationState,
        conversationData,
        path: window.location.pathname,
        participantsCount: participants?.length || 0
      });
      
      sessionStorage.setItem('isAdminSession', 'true');
      
      toast({
        title: "Admin Session Interface",
        description: "You are viewing the admin interface. You can monitor and manage the session."
      });
    }
  }, [isLoading, currentConversationId, locationState, conversationData, participants, toast]);
  
  // Reset messages when switching sessions
  useEffect(() => {
    if (currentConversationId) {
      setSessionMessages([]);
    }
  }, [currentConversationId]);
  
  // Redirect logic
  if (!adminViewReady && !isLoading && !currentConversationId && !locationState?.newConversationId) {
    console.log("No conversation ID found, checking if we should show admin interface anyway");
    
    if (sessionStorage.getItem('isAdminSession') === 'true' || window.location.pathname.includes('/admin')) {
      console.log("Admin session detected - showing admin interface despite missing conversation ID");
      setAdminViewReady(true);
    } else {
      console.error("No conversation ID found on admin page, redirecting home");
      return <Navigate to="/" />;
    }
  }

  // Calculate total messages count
  const totalMessages = sessionMessages?.length || 0;

  // Generate participant colors mapping
  const participantColors = participants.reduce((colors, participant) => {
    colors[`P${participant.id}`] = getParticipantColor(`P${participant.id}`);
    return colors;
  }, {} as { [key: string]: string });

  return (
    <div className="flex flex-col h-screen">
      {/* Simplified admin header - now the only header */}
      <SimplifiedAdminHeader
        conversationData={conversationData}
        onCloseAndReport={exportSessionData}
        onSendMessage={handleSendAdminMessage}
        isGeneratingReport={false}
        participantCount={conversationData?.current_participants || 0}
        maxParticipants={conversationData?.participants || 10}
        onWrapUp={async () => {
          await toggleSessionState();
        }}
        isWrappingUp={isSessionPaused}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages area - split view for admin monitoring and participant interaction */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Admin monitoring view */}
          <div className="flex-1 overflow-hidden border-b border-gray-200">
            <div className="h-full">
              <SimplifiedAdminMessagingView
                messages={sessionMessages || []}
                participantColors={participantColors}
                currentParticipantCount={conversationData?.current_participants || 0}
                conversationData={conversationData}
              />
            </div>
          </div>
          
          {/* Participant interaction view */}
          <div className="h-64 border-t border-gray-200 bg-gray-50">
            <div className="p-2 bg-gray-100 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Participant Test Interface</h3>
              <p className="text-xs text-gray-500">Send messages as Participant {currentParticipant || 1}</p>
            </div>
            <div className="h-full">
              <ParticipantMessagingView
                messages={sessionMessages || []}
                participantColors={participantColors}
                currentParticipant={currentParticipant || 1}
                isWaitingForResponse={isWaitingForResponse}
                participants={participants}
                conversationId={currentConversationId}
                currentParticipantCount={conversationData?.current_participants || 0}
                maxParticipants={conversationData?.participants || 10}
                isMobile={isMobile}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={handleSendMessage}
                isRecording={false}
                setIsRecording={() => {}}
                isAnonymous={isAnonymous}
                toggleAnonymous={toggleAnonymous}
                hasAnswered={hasAnswered}
                totalResponses={totalResponses}
                viewMode="participant"
                participantNames={{}}
                currentUserParticipantId={currentParticipant}
                showResponseStats={false}
                conversationData={conversationData}
              />
            </div>
          </div>
        </div>
        
        {/* Participant sidebar */}
        <AdminParticipantList
          participants={participants || []}
          currentParticipantCount={conversationData?.current_participants || 0}
          maxParticipants={conversationData?.participants || 10}
          isLoading={isLoadingParticipants}
          conversationData={conversationData}
        />
      </div>
    </div>
  );
};

export default SessionAdmin;
