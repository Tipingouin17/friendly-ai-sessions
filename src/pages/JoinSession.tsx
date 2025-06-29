
import { useSearchParams, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import JoinSessionErrorState from "@/components/session/JoinSessionErrorState";
import JoinSessionRejoinPrompt from "@/components/session/JoinSessionRejoinPrompt";
import JoinSessionMain from "@/components/session/JoinSessionMain";
import { useQueryClient } from "@tanstack/react-query";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [joinSuccess, setJoinSuccess] = useState<{
    conversationId: number;
    participantId: number;
    name: string;
    avatarSeed: string;
  } | null>(null);
  
  // Use ref to prevent multiple navigation attempts during same render cycle
  const hasNavigated = useRef(false);
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();
  
  // Memoize existingSessionData to prevent infinite re-renders
  const existingSessionData = useMemo(() => {
    return conversationId ? getSessionByConversationId(conversationId) : null;
  }, [conversationId, getSessionByConversationId]);
  
  // Guard variable to detect if user has already joined
  const hasJoinedBefore = !!existingSessionData?.participantId;
  
  // Use function initialization to avoid re-renders
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(() => !!existingSessionData);
  
  // Prepare default values for the hook
  const defaultParticipantName = existingSessionData?.name || "";
  const defaultAvatarSeed = existingSessionData?.avatarSeed || Math.random().toString();

  // Navigate to participant session if join was successful - MOVED TO TOP
  if (joinSuccess && !hasNavigated.current) {
    hasNavigated.current = true;
    const navigationPath = `/session?id=${joinSuccess.conversationId}&name=${encodeURIComponent(joinSuccess.name)}&participantId=${joinSuccess.participantId}&avatarSeed=${encodeURIComponent(joinSuccess.avatarSeed)}`;
    console.log("🚀 Navigating to participant session:", navigationPath);
    return <Navigate to={navigationPath} replace />;
  }
  
  // Validate that we have a valid conversation ID
  useEffect(() => {
    if (!conversationId) {
      console.error("No valid conversation ID found in URL parameters:", idParam);
      setInvalidRequest(true);
    } else {
      console.log("JoinSession: Using conversation ID:", conversationId);
      // Force invalidate any existing queries for this conversation
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }
  }, [conversationId, idParam, queryClient]);
  
  // Force refresh conversation data when joining a session
  useEffect(() => {
    if (conversationId && !hasNavigated.current) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true });
    }
  }, [conversationId, queryClient, retryCount]);
  
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
    existingSessionData: hookExistingSessionData
  } = useJoinSessionData(conversationId, {
    defaultParticipantName,
    defaultAvatarSeed
  });

  // Handle successful join - set success state for navigation (GUARDED)
  const handleJoin = async () => {
    // Don't allow join if user has already joined before or already navigating
    if (hasJoinedBefore || hasNavigated.current) {
      console.log("User has already joined before or is navigating, skipping join attempt");
      return;
    }
    
    const result = await handleJoinSession();
    if (result && conversationId && !hasNavigated.current) {
      console.log("Successfully joined session, preparing for navigation:", result);
      setJoinSuccess({
        conversationId,
        participantId: result.participantId,
        name: result.name,
        avatarSeed: result.avatarSeed
      });
    }
  };

  const handleRetry = useCallback(() => {
    if (conversationId && !hasNavigated.current) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      setJoinSuccess(null);
      hasNavigated.current = false;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient]);
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId && !hasNavigated.current) {
      console.log("Rejoining session with existing data:", existingSessionData);
      setJoinSuccess({
        conversationId,
        participantId: existingSessionData.participantId,
        name: existingSessionData.name,
        avatarSeed: existingSessionData.avatarSeed
      });
    }
  }, [existingSessionData, conversationId]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    if (!hasNavigated.current) {
      setShowRejoinPrompt(false);
      setJoinSuccess(null);
      hasNavigated.current = false;
    }
  }, []);

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
      onJoinSession={!hasJoinedBefore && !hasNavigated.current ? handleJoin : undefined}
      isJoining={isJoining}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSession;
