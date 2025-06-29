
import { useSearchParams, Navigate } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useJoinSessionData } from "@/hooks/useJoinSessionData";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import JoinSessionErrorState from "@/components/session/JoinSessionErrorState";
import JoinSessionRejoinPrompt from "@/components/session/JoinSessionRejoinPrompt";
import JoinSessionMain from "@/components/session/JoinSessionMain";
import { useQueryClient } from "@tanstack/react-query";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useNavigateToSession } from "@/hooks/session-joining/useNavigateToSession";

const JoinSession = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [hasJoined, setHasJoined] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();
  const { navigateToSession } = useNavigateToSession();
  
  // Memoize existingSessionData to prevent infinite re-renders
  const existingSessionData = useMemo(() => {
    return conversationId ? getSessionByConversationId(conversationId) : null;
  }, [conversationId, getSessionByConversationId]);
  
  // Use function initialization to avoid re-renders
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(() => !!existingSessionData);
  
  // Prepare default values for the hook
  const defaultParticipantName = existingSessionData?.name || "";
  const defaultAvatarSeed = existingSessionData?.avatarSeed || Math.random().toString();
  
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
    if (conversationId) {
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
    joinResult
  } = useJoinSessionData(conversationId, {
    defaultParticipantName,
    defaultAvatarSeed
  });

  // BULLETPROOF NAVIGATION: One-time navigation effect with guard
  useEffect(() => {
    if (
      !hasNavigated &&
      hasJoined &&
      conversationId &&
      (joinResult || existingSessionData)
    ) {
      const participantData = joinResult || existingSessionData;
      if (participantData) {
        console.log("🚀 Navigating to participant session once:", {
          conversationId,
          participantId: participantData.participantId,
          name: participantData.name,
          avatarSeed: participantData.avatarSeed
        });
        
        navigateToSession(
          conversationId,
          participantData.name,
          participantData.participantId,
          participantData.avatarSeed
        );
        setHasNavigated(true);
      }
    }
  }, [
    hasNavigated,
    hasJoined,
    conversationId,
    joinResult,
    existingSessionData,
    navigateToSession
  ]);

  // Handle successful join - set hasJoined flag instead of navigating directly
  const handleJoin = async () => {
    const result = await handleJoinSession();
    if (result) {
      console.log("Successfully joined session, preparing to navigate:", result);
      setHasJoined(true);
    }
  };

  const handleRetry = useCallback(() => {
    if (conversationId) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      setHasJoined(false);
      setHasNavigated(false);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient]);
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId) {
      console.log("Rejoining session with existing data:", existingSessionData);
      setHasJoined(true);
    }
  }, [existingSessionData, conversationId]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    setShowRejoinPrompt(false);
    setHasJoined(false);
    setHasNavigated(false);
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
      onJoinSession={handleJoin}
      isJoining={isJoining}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSession;
