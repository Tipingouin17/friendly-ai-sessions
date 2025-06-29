
import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import { useJoinSessionNavigation } from "@/hooks/useJoinSessionNavigation";
import { useJoinSessionState } from "@/hooks/useJoinSessionState";
import JoinSessionLoadingState from "./JoinSessionLoadingState";
import JoinSessionErrorState from "./JoinSessionErrorState";
import JoinSessionRejoinPrompt from "./JoinSessionRejoinPrompt";
import JoinSessionMain from "./JoinSessionMain";

const JoinSessionContainer = () => {
  const queryClient = useQueryClient();
  
  // Navigation management
  const {
    hasNavigated,
    hasProcessedJoin,
    isNavigatingRef,
    navigateToSession,
    resetNavigationFlags,
    checkNavigationState
  } = useJoinSessionNavigation();
  
  // CRITICAL: Check navigation state first before any other processing
  if (checkNavigationState()) {
    console.log("Navigation already initiated, stopping component processing");
    return null;
  }
  
  // State management
  const {
    conversationId,
    invalidRequest,
    retryCount,
    setRetryCount,
    existingSessionData,
    hasJoinedBefore,
    showRejoinPrompt,
    setShowRejoinPrompt,
    defaultParticipantName,
    defaultAvatarSeed
  } = useJoinSessionState(checkNavigationState);
  
  // Force refresh conversation data when joining a session (only once)
  useEffect(() => {
    if (checkNavigationState() || hasProcessedJoin.current) return;
    
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true });
      hasProcessedJoin.current = true;
    }
  }, [conversationId, queryClient, checkNavigationState]);
  
  const {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading,
    error,
    handleJoinSession
  } = useJoinSessionData(conversationId, {
    defaultParticipantName,
    defaultAvatarSeed
  });

  // Handle successful join - navigate immediately and synchronously
  const handleJoin = useCallback(async () => {
    // CRITICAL: Check navigation state first
    if (checkNavigationState() || hasJoinedBefore || isJoining) {
      console.log("Navigation already initiated or join in progress, skipping");
      return;
    }
    
    console.log("Starting join process...");
    
    try {
      const result = await handleJoinSession();
      if (result && conversationId) {
        console.log("Successfully joined session, navigating immediately:", result);
        navigateToSession(conversationId, result.name, result.participantId, result.avatarSeed);
        return;
      }
    } catch (error) {
      console.error("Error during join:", error);
      // Reset navigation flags on error so user can retry
      resetNavigationFlags();
    }
  }, [handleJoinSession, conversationId, navigateToSession, hasJoinedBefore, isJoining, checkNavigationState, resetNavigationFlags]);

  const handleRetry = useCallback(() => {
    if (conversationId && !checkNavigationState()) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      resetNavigationFlags();
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient, checkNavigationState, resetNavigationFlags, setRetryCount]);
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId && !checkNavigationState()) {
      console.log("Rejoining session with existing data:", existingSessionData);
      navigateToSession(
        conversationId, 
        existingSessionData.name, 
        existingSessionData.participantId, 
        existingSessionData.avatarSeed
      );
    }
  }, [existingSessionData, conversationId, navigateToSession, checkNavigationState]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    if (!checkNavigationState()) {
      setShowRejoinPrompt(false);
    }
  }, [checkNavigationState, setShowRejoinPrompt]);

  // CRITICAL: Check navigation state again before any rendering
  if (checkNavigationState()) {
    console.log("Navigation flags set, returning null to stop rendering");
    return null;
  }

  // Show loading state when data is being fetched
  if (isLoading && !invalidRequest) {
    return <JoinSessionLoadingState onRetry={handleRetry} error={error} />;
  }

  // Show error state if invalid request or no conversation data
  if (invalidRequest || (!conversation && !isLoading)) {
    console.error("Session not found or error:", error, "Conversation ID:", conversationId);
    
    return (
      <JoinSessionErrorState 
        error={error}
        invalidRequest={invalidRequest}
        onRetry={handleRetry}
      />
    );
  }

  // Show rejoin prompt if we have existing session data
  if (showRejoinPrompt && existingSessionData) {
    return (
      <JoinSessionRejoinPrompt
        existingSessionData={existingSessionData}
        onRejoin={handleRejoin}
        onJoinAsNew={handleJoinAsNew}
      />
    );
  }

  return (
    <JoinSessionMain
      conversation={conversation}
      error={error}
      isFull={isFull}
      participantName={participantName}
      onNameChange={(e) => setParticipantName(e.target.value)}
      avatarSeed={avatarSeed}
      onAvatarChange={() => setAvatarSeed(Math.random().toString())}
      onJoinSession={!hasJoinedBefore && !checkNavigationState() ? handleJoin : undefined}
      isJoining={isJoining}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSessionContainer;
