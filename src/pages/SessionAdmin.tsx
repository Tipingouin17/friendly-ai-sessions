
import React, { useEffect, useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useAdminStatusPersistence } from "@/hooks/useAdminStatusPersistence";
import { useAdminSessionLoader } from "@/hooks/useAdminSessionLoader";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import SessionView from "@/components/session/SessionView";
import AdminSessionHeader from "@/components/session/AdminSessionHeader";
import AdminSessionMessages from "@/components/session/AdminSessionMessages";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";

const SessionAdmin = () => {
  // Enforce admin status
  const { forceAdmin } = useAdminStatusPersistence();
  const initialRenderRef = useRef(true);
  const adminViewMountedRef = useRef(true);

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
  
  // Participant tracking
  const {
    participants,
    setParticipants,
    isLoading: isLoadingParticipants
  } = useParticipantTracking(locationState, conversationData, currentConversationId);
  
  // Initialize session messages with empty array
  const [sessionMessages, setSessionMessages] = useState([]);
  
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
    }
  }, [isLoading, currentConversationId, locationState, conversationData, participants]);
  
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

  // Show session provider when initialized
  if ((!isLoading && (hasInitializedProvider || adminViewReady) && !error) || adminViewReady) {
    return (
      <SessionProviderWrapper
        handleSessionFull={handleSessionFull}
        onError={handleError}
        forceAdmin={true}
      >
        {(props) => (
          <SessionErrorBoundary
            error={error}
            noSessionFound={noSessionFound}
            connectionAttempts={connectionAttempts}
            retryConnection={retryConnection}
            lastAttemptTime={lastAttemptTime || 0}
            isAdmin={true}
          >
            <SessionView 
              props={{
                ...props,
                onSendAdminMessage: handleSendAdminMessage,
                isAdmin: true
              }} 
              isAdmin={true} 
            />
          </SessionErrorBoundary>
        )}
      </SessionProviderWrapper>
    );
  }

  // Show loading or admin panel UI
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
