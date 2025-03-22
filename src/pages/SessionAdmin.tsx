
import React, { useEffect, useState, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import { useAdminStatusPersistence } from "@/hooks/useAdminStatusPersistence";
import { useAdminSessionLoader } from "@/hooks/useAdminSessionLoader";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import AdminSessionHeader from "@/components/session/AdminSessionHeader";
import AdminSessionMessages from "@/components/session/AdminSessionMessages";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";
import { Message } from "@/types/chat";
import { useToast } from "@/components/ui/use-toast";
import { Timer, ChevronRight, User2, CalendarClock, BookOpen } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const SessionAdmin = () => {
  // Enforce admin status
  const { forceAdmin } = useAdminStatusPersistence();
  const initialRenderRef = useRef(true);
  const adminViewMountedRef = useRef(true);
  const { toast } = useToast();
  const location = useLocation();

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
    // When location changes (new session ID in URL), reset state
    console.log("Location or conversation ID changed in SessionAdmin");
    
    // Reset initialized provider when switching sessions
    setHasInitializedProvider(false);
    setIsLoading(true);
    
    // Force admin status
    sessionStorage.setItem('isAdminSession', 'true');
  }, [location.search, location.pathname, setHasInitializedProvider, setIsLoading]);
  
  // Set admin status in session storage immediately
  useEffect(() => {
    sessionStorage.setItem('isAdminSession', 'true');
    console.log("Admin session confirmed on mount");
  }, []);
  
  // Participant tracking - pass nullish conversationId properly with fallback empty array for participants
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
    participants: participants || [], // Provide empty array as fallback
    messages: sessionMessages || [], // Provide empty array as fallback
    setMessages: setSessionMessages
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
    
    // Safety timeout to force admin view ready in case other conditions don't trigger
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
      
      // Make sure admin status is set
      sessionStorage.setItem('isAdminSession', 'true');
      
      // Show admin notification
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
  
  // Redirect if no conversation ID and not in loading state
  // Only redirect if BOTH: not loading AND no conversation ID AND no new conversation id AND not admin view ready
  // This prevents unnecessary redirects for admin sessions
  if (!adminViewReady && !isLoading && !currentConversationId && !locationState?.newConversationId) {
    console.log("No conversation ID found, checking if we should show admin interface anyway");
    
    // For admin sessions, we'll show the admin interface anyway even without a conversation ID
    if (sessionStorage.getItem('isAdminSession') === 'true' || window.location.pathname.includes('/admin')) {
      console.log("Admin session detected - showing admin interface despite missing conversation ID");
      // Force admin view ready to prevent redirect
      setAdminViewReady(true);
    } else {
      console.error("No conversation ID found on admin page, redirecting home");
      return <Navigate to="/" />;
    }
  }

  // Extract session details from conversation data
  const sessionDetails = conversationData?.sessions || {};
  const facilitatorDetails = sessionDetails?.facilitator_details || {};

  // Show the enhanced admin panel UI
  return (
    <div className="flex flex-col min-h-screen pt-16">
      <AdminSessionHeader 
        conversationData={conversationData}
        currentParticipantCount={conversationData?.current_participants || participants?.length || 0}
        isSessionPaused={isSessionPaused}
        onToggleSessionState={toggleSessionState}
        onSendAdminMessage={handleSendAdminMessage}
        onExportData={exportSessionData}
      />
      
      {sessionDetails && Object.keys(sessionDetails).length > 0 && (
        <div className="bg-gray-50 p-2 border-b">
          <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center gap-4 text-sm">
            {sessionDetails.session_type && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {sessionDetails.session_type.replace('_', ' ')}
              </Badge>
            )}
            
            {sessionDetails.skill_level && (
              <div className="flex items-center gap-1 text-gray-600">
                <User2 className="h-3.5 w-3.5" />
                <span>Level: {sessionDetails.skill_level}</span>
              </div>
            )}
            
            {sessionDetails.duration_minutes && (
              <div className="flex items-center gap-1 text-gray-600">
                <Timer className="h-3.5 w-3.5" />
                <span>{sessionDetails.duration_minutes} min</span>
              </div>
            )}
            
            {facilitatorDetails?.expertise_level && (
              <div className="flex items-center gap-1 text-gray-600">
                <BookOpen className="h-3.5 w-3.5" />
                <span>Facilitator: {facilitatorDetails.expertise_level}</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          <AdminSessionMessages
            messages={sessionMessages || []} // Ensure messages is always an array
            isLoading={isLoading || isConversationLoading}
            participants={participants || []} // Ensure participants is always an array
            conversationData={conversationData}
            onSendMessage={handleAdminMessage}
          />
        </div>
        
        <AdminParticipantList
          participants={participants || []} // Ensure participants is always an array
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
