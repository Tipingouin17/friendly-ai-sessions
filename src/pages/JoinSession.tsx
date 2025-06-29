
import { useSearchParams, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use ref to prevent multiple navigation attempts and processing
  const hasNavigated = useRef(false);
  const hasProcessedJoin = useRef(false);
  const isNavigatingRef = useRef(false);
  
  // CRITICAL: Check navigation state first before any other processing
  if (hasNavigated.current || isNavigatingRef.current) {
    console.log("Navigation already initiated, stopping component processing");
    return null;
  }
  
  const [invalidRequest, setInvalidRequest] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Safely parse the conversation ID from URL
  const idParam = searchParams.get("id");
  const conversationId = idParam && !isNaN(Number(idParam)) ? Number(idParam) : null;
  
  // Participant persistence hooks
  const { getSessionByConversationId } = useParticipantPersistence();
  
  // Memoize existingSessionData to prevent infinite re-renders
  const existingSessionData = useMemo(() => {
    if (hasNavigated.current || isNavigatingRef.current) return null;
    return conversationId ? getSessionByConversationId(conversationId) : null;
  }, [conversationId, getSessionByConversationId]);
  
  // Guard variable to detect if user has already joined
  const hasJoinedBefore = !!existingSessionData?.participantId;
  
  // Use function initialization to avoid re-renders
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(() => {
    if (hasNavigated.current || isNavigatingRef.current) return false;
    return !!existingSessionData;
  });
  
  // Prepare default values for the hook
  const defaultParticipantName = existingSessionData?.name || "";
  const defaultAvatarSeed = existingSessionData?.avatarSeed || Math.random().toString();

  // Validate that we have a valid conversation ID
  useEffect(() => {
    if (hasNavigated.current || isNavigatingRef.current) return;
    
    if (!conversationId) {
      console.error("No valid conversation ID found in URL parameters:", idParam);
      setInvalidRequest(true);
    } else {
      console.log("JoinSession: Using conversation ID:", conversationId);
    }
  }, [conversationId, idParam]);
  
  // Force refresh conversation data when joining a session (only once)
  useEffect(() => {
    if (hasNavigated.current || isNavigatingRef.current || hasProcessedJoin.current) return;
    
    if (conversationId) {
      console.log("JoinSession: Invalidating queries and forcing refresh for conversation:", conversationId);
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true });
      hasProcessedJoin.current = true;
    }
  }, [conversationId, queryClient]);
  
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

  // Handle successful join - navigate immediately and synchronously
  const handleJoin = useCallback(async () => {
    // CRITICAL: Check navigation state first
    if (hasNavigated.current || isNavigatingRef.current || hasJoinedBefore || isJoining) {
      console.log("Navigation already initiated or join in progress, skipping");
      return;
    }
    
    // Set navigation flags immediately to prevent any further processing
    isNavigatingRef.current = true;
    hasNavigated.current = true;
    
    console.log("Starting join process...");
    
    try {
      const result = await handleJoinSession();
      if (result && conversationId) {
        console.log("Successfully joined session, navigating immediately:", result);
        
        // Navigate immediately and synchronously
        const navigationPath = `/session?id=${conversationId}&name=${encodeURIComponent(result.name)}&participantId=${result.participantId}&avatarSeed=${encodeURIComponent(result.avatarSeed)}`;
        console.log("🚀 Navigating to participant session:", navigationPath);
        
        // Use replace to prevent back navigation issues
        navigate(navigationPath, { replace: true });
        
        // Immediately return to prevent any further processing
        return;
      }
    } catch (error) {
      console.error("Error during join:", error);
      // Reset navigation flags on error so user can retry
      hasNavigated.current = false;
      isNavigatingRef.current = false;
    }
  }, [handleJoinSession, conversationId, navigate, hasJoinedBefore, isJoining]);

  const handleRetry = useCallback(() => {
    if (conversationId && !hasNavigated.current && !isNavigatingRef.current) {
      console.log("Retrying connection to session:", conversationId);
      setRetryCount(prev => prev + 1);
      hasNavigated.current = false;
      isNavigatingRef.current = false;
      hasProcessedJoin.current = false;
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.refetchQueries({ queryKey: ['conversation', conversationId], exact: true, type: 'active' });
    }
  }, [conversationId, queryClient]);
  
  // Handle rejoining the session with existing data
  const handleRejoin = useCallback(() => {
    if (existingSessionData && conversationId && !hasNavigated.current && !isNavigatingRef.current) {
      console.log("Rejoining session with existing data:", existingSessionData);
      
      // Set navigation flags immediately
      isNavigatingRef.current = true;
      hasNavigated.current = true;
      
      // Navigate immediately
      const navigationPath = `/session?id=${conversationId}&name=${encodeURIComponent(existingSessionData.name)}&participantId=${existingSessionData.participantId}&avatarSeed=${encodeURIComponent(existingSessionData.avatarSeed)}`;
      console.log("🚀 Rejoining - navigating to participant session:", navigationPath);
      navigate(navigationPath, { replace: true });
    }
  }, [existingSessionData, conversationId, navigate]);
  
  // Handle joining as a new participant
  const handleJoinAsNew = useCallback(() => {
    if (!hasNavigated.current && !isNavigatingRef.current) {
      setShowRejoinPrompt(false);
    }
  }, []);

  // CRITICAL: Check navigation state again before any rendering
  if (hasNavigated.current || isNavigatingRef.current) {
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
      onJoinSession={!hasJoinedBefore && !hasNavigated.current && !isNavigatingRef.current ? handleJoin : undefined}
      isJoining={isJoining}
      currentParticipantCount={currentParticipantCount}
      effectiveMaxParticipants={effectiveMaxParticipants}
      onRetry={handleRetry}
    />
  );
};

export default JoinSession;
