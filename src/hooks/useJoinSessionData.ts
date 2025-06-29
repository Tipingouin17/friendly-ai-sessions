
import { useState, useEffect } from "react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useSessionParticipants } from "@/hooks/useSessionParticipants";
import { useSessionJoiner } from "@/hooks/session-joining/useSessionJoiner";
import { ConversationWithSession } from "@/types/database";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useToast } from "@/components/ui/use-toast";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";

interface UseJoinSessionDataOptions {
  defaultParticipantName?: string;
  defaultAvatarSeed?: string;
}

interface JoinResult {
  participantId: number;
  name: string;
  avatarSeed: string;
  isAdmin: boolean;
}

export function useJoinSessionData(
  conversationId: number | null, 
  options?: UseJoinSessionDataOptions
) {
  const { toast } = useToast();
  const { isAdmin } = useSessionAdminStatus();
  
  // Check if on admin route for stronger admin override
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const effectiveIsAdmin = isAdmin || isOnAdminPath || sessionStorage.getItem('isAdminSession') === 'true';
  
  // Get persisted participant data
  const { getSessionByConversationId } = useParticipantPersistence();
  const existingSessionData = conversationId ? getSessionByConversationId(conversationId) : null;
  
  // Initialize participant state with provided defaults (pure, no side effects)
  const [participantName, setParticipantName] = useState(() => options?.defaultParticipantName || "");
  const [avatarSeed, setAvatarSeed] = useState(() => options?.defaultAvatarSeed || Math.random().toString());
  const [joinResult, setJoinResult] = useState<JoinResult | null>(null);
  
  // Debug logging
  useEffect(() => {
    console.log("useJoinSessionData initialized", {
      conversationId,
      isAdmin,
      effectiveIsAdmin,
      isOnAdminPath,
      storedIsAdmin: sessionStorage.getItem('isAdminSession') === 'true',
      currentPath: window.location.pathname,
      existingSessionData
    });
  }, [conversationId, isAdmin, effectiveIsAdmin, isOnAdminPath, existingSessionData]);
  
  // Fetch plan limits as fallback
  const { maxParticipants: planMaxParticipants } = usePlanLimits();
  
  // Use our hooks
  const { 
    currentParticipantCount, 
    maxParticipantsForSession, 
    conversation,
    error: participantsError,
    refetch
  } = useSessionParticipants(conversationId);
  
  const { 
    isJoining, 
    error: joinerError, 
    joinSession,
    setError 
  } = useSessionJoiner();

  // Combine errors from both hooks
  const error = participantsError || joinerError;

  // Check if this is an admin joining
  useEffect(() => {
    if (effectiveIsAdmin && conversationId) {
      console.log("Admin detected in useJoinSessionData - should bypass session full checks");
    }
  }, [effectiveIsAdmin, conversationId]);

  const handleJoinSession = async (): Promise<JoinResult | null> => {
    // Enhanced admin detection - check all sources
    const effectiveIsAdmin = isAdmin || 
                           isOnAdminPath ||
                           sessionStorage.getItem('isAdminSession') === 'true' ||
                           window.location.pathname.includes('/admin');
    
    // Force a refetch before joining to ensure we have the latest counts
    await refetch();
    
    // Use session-specific max or fall back to plan limit
    const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
      maxParticipantsForSession : planMaxParticipants;

    console.log("Join session check:", {
      participantName,
      conversationId,
      currentParticipantCount,
      effectiveMaxParticipants,
      isFull: effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants,
      isAdmin: effectiveIsAdmin,
      isOnAdminPath
    });

    if (!participantName.trim()) {
      toast({
        title: "Please enter your name",
        description: "A name is required to join the session.",
        variant: "destructive",
      });
      return null;
    }

    // Skip check if on admin route or admin user - they should always be able to join
    if (!isOnAdminPath && !effectiveIsAdmin) {
      // Only check if session is full if effectiveMaxParticipants is greater than 0
      if (effectiveMaxParticipants > 0 && currentParticipantCount >= effectiveMaxParticipants) {
        toast({
          title: "Session Full",
          description: "This session has reached its maximum capacity of participants.",
          variant: "destructive",
        });
        setError("This session has reached its maximum capacity of participants.");
        return null;
      }
    }

    const result = await joinSession({
      conversationId,
      participantName,
      avatarSeed,
      conversation: conversation as ConversationWithSession,
      currentParticipantCount,
      refetch,
      isAdmin: effectiveIsAdmin
    });

    if (result) {
      console.log("Join session successful, storing result:", result);
      setJoinResult(result);
      // Note: We no longer navigate here - let the component handle navigation
    }

    return result;
  };
  
  // Calculate effective max participants
  const effectiveMaxParticipants = maxParticipantsForSession > 0 ? 
    maxParticipantsForSession : planMaxParticipants;
    
  // Only consider session full if effectiveMaxParticipants is greater than 0
  // And we're not an admin
  const isFull = !effectiveIsAdmin && 
                !isOnAdminPath && 
                effectiveMaxParticipants > 0 && 
                currentParticipantCount >= effectiveMaxParticipants;

  return {
    participantName,
    setParticipantName,
    avatarSeed,
    setAvatarSeed,
    isJoining,
    currentParticipantCount,
    effectiveMaxParticipants,
    isFull,
    conversation,
    isLoading: !conversation && !error,
    error,
    handleJoinSession,
    existingSessionData,
    joinResult
  };
}
