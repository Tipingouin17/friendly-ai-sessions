
import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import { useJoinSessionNavigation } from "@/hooks/useJoinSessionNavigation";
import { useJoinSessionState } from "@/hooks/useJoinSessionState";
import { useWelcomeMessageMonitor } from "@/hooks/useWelcomeMessageMonitor";
import JoinSessionLoadingState from "./JoinSessionLoadingState";
import JoinSessionErrorState from "./JoinSessionErrorState";
import JoinSessionRejoinPrompt from "./JoinSessionRejoinPrompt";
import JoinSessionMain from "./JoinSessionMain";

const JoinSessionContainer = () => {
  const queryClient = useQueryClient();

  // Track join result to monitor welcome message generation
  const [joinResult, setJoinResult] = useState<{
    conversationId: number;
    participantId: number;
    name: string;
    avatarSeed: string;
  } | null>(null);

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
    // We cannot return null here as it would violate Rules of Hooks
    // subsequent hooks must still be executed
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
  } = useJoinSessionState();

  // Force refresh conversation data when joining a session (only once)
  useEffect(() => {
    if (checkNavigationState() || hasProcessedJoin.current) return;

    if (conversationId) {
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

  // Monitor welcome message generation after joining
  const {
    isWaiting: isWaitingForMessage,
    hasMessage,
    error: messageError,
    retryCount: messageRetryCount,
    waitForWelcomeMessage
  } = useWelcomeMessageMonitor({
    conversationId: joinResult?.conversationId || null,
    participantId: joinResult?.participantId || null,
    isEnabled: !!joinResult
  });

  // Handle successful join - wait for welcome message before redirecting
  const handleJoin = useCallback(async () => {
    // CRITICAL: Check navigation state first
    if (checkNavigationState() || hasJoinedBefore || isJoining) {
      return;
    }

    try {
      const result = await handleJoinSession();
      if (result && conversationId) {

        // Store join result to start message monitoring
        setJoinResult({
          conversationId,
          participantId: result.participantId,
          name: result.name,
          avatarSeed: result.avatarSeed
        });

        // Wait for welcome message before navigating
        const messageReady = await waitForWelcomeMessage();

        if (messageReady) {
          navigateToSession(conversationId, result.name, result.participantId, result.avatarSeed);
        } else {
          navigateToSession(conversationId, result.name, result.participantId, result.avatarSeed);
        }
        return;
      }
    } catch (error) {
      console.error("Error during join:", error);
      // Reset navigation flags on error so user can retry
      resetNavigationFlags();
      setJoinResult(null);
    }
  }, [handleJoinSession, conversationId, navigateToSession, hasJoinedBefore, isJoining, checkNavigationState, resetNavigationFlags, waitForWelcomeMessage]);

  const handleRetry = useCallback(() => {
    if (conversationId && !checkNavigationState()) {
      setRetryCount(prev => prev + 1);
      resetNavigationFlags();
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient, checkNavigationState, resetNavigationFlags, setRetryCount]);

  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId && !checkNavigationState()) {
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

  // Auto-redirect if session exists
  useEffect(() => {
    if (existingSessionData && conversationId && !checkNavigationState()) {
      handleRejoin();
    }
  }, [existingSessionData, conversationId, checkNavigationState, handleRejoin]);

  // CRITICAL: Check navigation state again before any rendering
  if (checkNavigationState()) {
    return null;
  }

  // Show loading state when data is being fetched or waiting for welcome message
  if ((isLoading && !invalidRequest) || isWaitingForMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading session...</div>
      </div>
    );
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
