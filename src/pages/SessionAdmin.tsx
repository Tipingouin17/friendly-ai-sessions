
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useAdminStatusPersistence } from "@/hooks/useAdminStatusPersistence";
import { useAdminSessionLoader } from "@/hooks/useAdminSessionLoader";
import { useAdminMessages } from "@/hooks/useAdminMessages";
import { ParticipantInfo } from "@/types/chat";
import SessionView from "@/components/session/SessionView";
import AdminSessionHeader from "@/components/session/AdminSessionHeader";
import AdminSessionMessages from "@/components/session/AdminSessionMessages";
import AdminParticipantList from "@/components/session/AdminParticipantList";
import { useParticipantTracking } from "@/hooks/useParticipantTracking";

const SessionAdmin = () => {
  // Enforce admin status
  const { forceAdmin } = useAdminStatusPersistence();

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
    locationState
  } = useAdminSessionLoader();
  
  // Participant tracking
  const {
    participants,
    setParticipants,
    isLoading: isLoadingParticipants
  } = useParticipantTracking(locationState, conversationData, currentConversationId);
  
  // Admin message handling
  const {
    sessionMessages,
    setSessionMessages,
    isSessionPaused,
    toggleSessionState,
    exportSessionData,
    handleAdminMessage,
    handleSendAdminMessage
  } = useAdminMessages({
    conversationId: currentConversationId,
    participants
  });
  
  // Calculate effective loading state
  const isLoading = sessionPageLoading || loaderIsLoading || isConversationLoading;
  
  // Log status on mount
  useEffect(() => {
    console.log("Admin session page mounted", {
      time: new Date().toISOString(),
      isAdmin: true,
      isLoading,
      currentConversationId,
      locationState,
      conversationData,
      path: window.location.pathname,
      participantsCount: participants.length
    });
  }, [isLoading, currentConversationId, locationState, conversationData, participants.length]);
  
  // Redirect if no conversation ID
  if (!currentConversationId && !isLoading && !locationState?.newConversationId) {
    console.error("No conversation ID found on admin page, redirecting home");
    return <Navigate to="/" />;
  }

  // Show session provider when initialized
  if (!isLoading && hasInitializedProvider && !error) {
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
        currentParticipantCount={conversationData?.current_participants || participants.length}
        isSessionPaused={isSessionPaused}
        onToggleSessionState={toggleSessionState}
        onSendAdminMessage={handleSendAdminMessage}
        onExportData={exportSessionData}
      />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          <AdminSessionMessages
            messages={sessionMessages}
            isLoading={isLoading || isConversationLoading}
            participants={participants}
            conversationData={conversationData}
            onSendMessage={handleAdminMessage}
          />
        </div>
        
        <AdminParticipantList
          participants={participants}
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
