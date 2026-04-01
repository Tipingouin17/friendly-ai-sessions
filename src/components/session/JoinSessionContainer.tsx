
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

  // Auto-redirect if session exists (but NOT if session is completed)
  useEffect(() => {
    if (existingSessionData && conversationId && !checkNavigationState()) {
      // Don't auto-redirect to a completed session
      if (conversation && (conversation.status === 'completed' || conversation.is_session_ended)) {
        return;
      }
      handleRejoin();
    }
  }, [existingSessionData, conversationId, checkNavigationState, handleRejoin, conversation]);

  // CRITICAL: Check navigation state again before any rendering
  if (checkNavigationState()) {
    return null;
  }

  // Show loading state when data is being fetched or waiting for welcome message
  if ((isLoading && !invalidRequest) || isWaitingForMessage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <svg className="w-7 h-7 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-lg">
            {isWaitingForMessage ? 'Preparing your session…' : 'Loading session…'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {isWaitingForMessage ? 'The AI facilitator is getting ready' : 'Please wait a moment'}
          </p>
        </div>
      </div>
    );
  }

  // Show session ended message if the conversation is completed
  if (conversation && (conversation.status === 'completed' || conversation.is_session_ended)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="mb-5 flex justify-center">
            <div className="p-4 bg-amber-50 rounded-full">
              <svg className="h-10 w-10 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Has Ended</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            This facilitated session has been completed. Thank you for your participation!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
          >
            Return Home
          </button>
        </div>
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
