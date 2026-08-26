/**
 * Join Session Container
 *
 * Session component for the AIfacilitator application.
 *
 * UX principle: never swap to a full-page loading screen during the normal
 * join flow.  The join form is shown immediately (with a skeleton while data
 * loads) and all status transitions (loading, preparing, waiting) are shown
 * inline inside the card — no jarring full-page swaps.
 */

import { useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import { useJoinSessionNavigation } from "@/hooks/useJoinSessionNavigation";
import { useJoinSessionState } from "@/hooks/useJoinSessionState";
import JoinSessionErrorState from "./JoinSessionErrorState";
import JoinSessionMain from "./JoinSessionMain";
import { isOrdinalParticipantLabel } from "@/utils/inputValidation";
import SessionFullPage from "./SessionFullPage";

/** Shared page shell so every full-page state looks identical */
const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-start sm:items-center justify-center px-4 pt-6 pb-4 sm:py-4">
    <div className="w-full max-w-md">
      {/* Brand header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-gray-900">AIfacilitator</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
        {children}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Powered by AIfacilitator · AI-driven workshop facilitation
      </p>
    </div>
  </div>
);

const JoinSessionContainer = () => {
  const queryClient = useQueryClient();

  // No need to track join result for welcome message — navigation is immediate.

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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
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
    handleJoinSession,
    isTokenReady,
    joinedParticipants
  } = useJoinSessionData(conversationId, {
    defaultParticipantName,
    defaultAvatarSeed
  });

  // Handle successful join — navigate immediately to the session page.
  // The session page shows a ThinkingIndicator while the AI generates the
  // welcome message in the background on the server side.
  const handleJoin = useCallback(async () => {
    // CRITICAL: Check navigation state first
    if (checkNavigationState() || isJoining) {
      return;
    }

    try {
      const result = await handleJoinSession();
      if (result && conversationId) {
        // Navigate immediately — the session page handles the ThinkingIndicator
        // while the AI generates the welcome message server-side.
        navigateToSession(conversationId, result.name, result.participantId, result.avatarSeed);
        return;
      }
    } catch (error) {
      console.error("Error during join:", error);
      // Reset navigation flags on error so user can retry
      resetNavigationFlags();
    }
  }, [handleJoinSession, conversationId, navigateToSession, isJoining, checkNavigationState, resetNavigationFlags]);

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

  // A legacy ordinal label must be corrected in the visible join form before
  // re-entry. All other persisted device-bound identities may still rejoin
  // immediately without a disruptive confirmation step.
  const requiresDisplayNameCorrection = Boolean(
    existingSessionData && isOrdinalParticipantLabel(existingSessionData.name)
  );

  // Auto-redirect if session exists (but NOT if session is completed or its
  // stored identity must be repaired).
  useEffect(() => {
    if (existingSessionData && conversationId && !requiresDisplayNameCorrection && !checkNavigationState()) {
      // Don't auto-redirect to a completed session
      if (conversation && (conversation.status === 'completed' || conversation.is_session_ended)) {
        return;
      }
      // Immediately hide the rejoin prompt and navigate — no flash
      setShowRejoinPrompt(false);
      handleRejoin();
    }
  }, [existingSessionData, conversationId, requiresDisplayNameCorrection, checkNavigationState, handleRejoin, conversation, setShowRejoinPrompt]);

  // CRITICAL: Check navigation state again before any rendering
  if (checkNavigationState()) {
    return null;
  }

  // ── Session ended ────────────────────────────────────────────────────────
  if (conversation && (conversation.status === 'completed' || conversation.is_session_ended)) {
    return (
      <PageShell>
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-indigo-50 rounded-full">
            <svg className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Session Has Ended</h2>
        <p className="text-gray-500 mb-7 text-sm leading-relaxed">
          This facilitated session has been completed. Thank you for your participation!
        </p>
        <button
          onClick={() => { window.location.href = '/'; }}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors"
        >
          Return Home
        </button>
      </PageShell>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
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

  // ── Session full ─────────────────────────────────────────────────────────
  if (isFull && !isLoading) {
    return (
      <SessionFullPage
        conversation={conversation}
        currentParticipantCount={currentParticipantCount}
        effectiveMaxParticipants={effectiveMaxParticipants}
        onSpotOpened={() => {
          // A spot opened — trigger a refetch so isFull recalculates
          handleRetry();
        }}
        onRefresh={handleRetry}
      />
    );
  }

  // ── Main join form (shown immediately, even while loading) ───────────────
  // The form renders with a skeleton while conversation data is loading.
  // After joining, the button shows an inline "Preparing session…" state
  // instead of swapping to a full-page spinner.
  return (
    <JoinSessionMain
      conversation={conversation}
      error={error}
      isFull={false}
      participantName={participantName}
      onNameChange={(e) => setParticipantName(e.target.value)}
      avatarSeed={avatarSeed}
      onAvatarChange={() => setAvatarSeed(Math.random().toString())}
      onJoinSession={handleJoin}
      isTokenReady={isTokenReady}
      isJoining={isJoining}
      isLoading={isLoading}
      isPreparingSession={false}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      joinedParticipants={joinedParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSessionContainer;
