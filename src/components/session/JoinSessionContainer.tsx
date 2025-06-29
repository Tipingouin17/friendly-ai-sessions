
import { useEffect, useCallback, useState } from "react";
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
  
  // State for navigation management
  const [shouldBlockRendering, setShouldBlockRendering] = useState(false);
  const [hasProcessedJoin, setHasProcessedJoin] = useState(false);
  
  // Navigation management with stable function references
  const {
    hasNavigated,
    isNavigatingRef,
    navigateToSession,
    resetNavigationFlags,
    checkNavigationState
  } = useJoinSessionNavigation();
  
  // Stable checkNavigationState with useCallback
  const stableCheckNavigationState = useCallback(() => {
    return checkNavigationState();
  }, [checkNavigationState]);
  
  // State management with stable navigation check
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
  } = useJoinSessionState(stableCheckNavigationState);
  
  // Check navigation state and block rendering if needed
  useEffect(() => {
    const isNavigating = stableCheckNavigationState();
    if (isNavigating) {
      console.log("Navigation already initiated, blocking component rendering");
      setShouldBlockRendering(true);
      return;
    }
    setShouldBlockRendering(false);
  }, [stableCheckNavigationState]);
  
  // Force refresh conversation data when joining a session (only once)
  useEffect(() => {
    if (shouldBlockRendering || hasProcessedJoin) return;
    
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true });
      setHasProcessedJoin(true);
    }
  }, [conversationId, queryClient, shouldBlockRendering, hasProcessedJoin]);
  
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
    // Check navigation state first
    if (stableCheckNavigationState() || hasJoinedBefore || isJoining) {
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
  }, [handleJoinSession, conversationId, navigateToSession, hasJoinedBefore, isJoining, stableCheckNavigationState, resetNavigationFlags]);

  const handleRetry = useCallback(() => {
    if (conversationId && !stableCheckNavigationState()) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      resetNavigationFlags();
      setHasProcessedJoin(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient, stableCheckNavigationState, resetNavigationFlags, setRetryCount]);
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId && !stableCheckNavigationState()) {
      console.log("Rejoining session with existing data:", existingSessionData);
      navigateToSession(
        conversationId, 
        existingSessionData.name, 
        existingSessionData.participantId, 
        existingSessionData.avatarSeed
      );
    }
  }, [existingSessionData, conversationId, navigateToSession, stableCheckNavigationState]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    if (!stableCheckNavigationState()) {
      setShowRejoinPrompt(false);
    }
  }, [stableCheckNavigationState, setShowRejoinPrompt]);

  // Early return if navigation is in progress - but only after all hooks are called
  if (shouldBlockRendering) {
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
      onJoinSession={!hasJoinedBefore && !stableCheckNavigationState() ? handleJoin : undefined}
      isJoining={isJoining}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSessionContainer;
