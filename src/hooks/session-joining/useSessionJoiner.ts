
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useNavigateToSession } from "./useNavigateToSession";
import { useSessionCapacityCheck } from "./useSessionCapacityCheck";
import { registerParticipant } from "./useParticipantRegistration";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { supabase } from "@/integrations/supabase/client";
import { sessionJoinSchema } from "@/utils/inputValidation";
import { sanitizeInput, createRateLimiter } from "@/utils/inputValidation";
import { validateSessionAccess } from "@/utils/securityHelpers";

interface SessionJoinParams {
  conversationId: number | null;
  participantName: string;
  avatarSeed: string;
  conversation: ConversationWithSession | null;
  currentParticipantCount: number;
  refetch: () => Promise<any>;
  isAnonymous?: boolean;
  isAdmin?: boolean;
}

// Create rate limiter: max 5 join attempts per minute
const joinRateLimiter = createRateLimiter(5, 60000);

export function useSessionJoiner() {
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { navigateToSession } = useNavigateToSession();
  const { isCheckingCapacity, checkCapacityAndUpdate } = useSessionCapacityCheck();
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  const { 
    persistParticipantData, 
    persistedParticipantData, 
    getSessionByConversationId,
    updateSessionAccessTime
  } = useParticipantPersistence();

  const joinSession = async ({
    conversationId,
    participantName,
    avatarSeed,
    conversation,
    currentParticipantCount,
    refetch,
    isAnonymous = false,
    isAdmin: forceAdmin = false
  }: SessionJoinParams) => {
    try {
      // Validate input parameters
      const validatedData = sessionJoinSchema.parse({
        participantName: sanitizeInput(participantName),
        avatarSeed: sanitizeInput(avatarSeed),
        conversationId,
        isAnonymous
      });

      // Rate limiting check
      const rateLimitKey = `join_${conversationId}_${Date.now().toString().slice(0, -3)}`; // Per minute
      if (!joinRateLimiter(rateLimitKey)) {
        toast({
          title: "Too many attempts",
          description: "Please wait a moment before trying to join again.",
          variant: "destructive",
        });
        return Promise.resolve();
      }

      if (!validatedData.participantName.trim()) {
        toast({
          title: "Please enter your name",
          description: "A name is required to join the session.",
          variant: "destructive",
        });
        return Promise.resolve();
      }

      // Check if we have persisted data for this conversation
      const sessionData = conversationId ? getSessionByConversationId(conversationId) : null;
      
      if (sessionData) {
        console.log("Using persisted participant data to rejoin session:", sessionData);
        
        // Validate session access
        const hasAccess = await validateSessionAccess(conversationId!, sessionData.participantId?.toString());
        if (!hasAccess && !sessionData.isAdmin) {
          throw new Error("You don't have permission to access this session");
        }
        
        // Update the last accessed time
        if (conversationId) {
          updateSessionAccessTime(conversationId);
        }
        
        // Show rejoining toast
        toast({
          title: "Rejoining Session",
          description: `Welcome back, ${sessionData.name || validatedData.participantName}!`,
        });
        
        // Navigate directly using persisted data
        setTimeout(() => {
          navigateToSession(
            conversationId!, 
            sessionData.name || validatedData.participantName, 
            sessionData.participantId, 
            sessionData.avatarSeed || validatedData.avatarSeed,
            sessionData.isAdmin || false
          );
        }, 500);
        
        return Promise.resolve();
      }

      setIsJoining(true);
      setError(null);

      // Force refresh data before joining to ensure we have latest counts
      await refetch();
      
      if (!conversation) {
        throw new Error("Session not found");
      }
      
      if (!conversationId) {
        throw new Error("Invalid session ID");
      }
      
      // Determine effective admin status from all sources
      const effectiveIsAdmin = forceAdmin || contextIsAdmin || sessionStorage.getItem('isAdminSession') === 'true';
      console.log("Attempting to join session with ID:", conversationId);
      console.log("Current participant count before update:", currentParticipantCount);
      console.log("Admin status for capacity check:", effectiveIsAdmin);
      
      // Check capacity BEFORE we try to update participant count - fixes race condition
      const capacityResult = await checkCapacityAndUpdate(conversationId, effectiveIsAdmin);
      
      // If the session is full and we're not an admin, block joining
      if (!capacityResult.canJoin && !effectiveIsAdmin) {
        throw new Error(capacityResult.error || "This session is full and cannot accept more participants.");
      }
      
      // Use the returned participant count as the participant ID
      const newParticipantId = capacityResult.newParticipantId;
      console.log("New participant ID:", newParticipantId);
      
      // Store the participant information in the session_participants table
      await registerParticipant({
        conversationId, 
        participantId: newParticipantId,
        participantName: validatedData.participantName,
        avatarSeed: validatedData.avatarSeed,
        isAnonymous,
        isAdmin: effectiveIsAdmin
      });
      
      // Create a session_event to log the participant joining
      try {
        await supabase
          .from('session_events')
          .insert({
            conversation_id: conversationId,
            event_type: 'participant_joined',
            data: {
              participant_id: newParticipantId,
              participant_name: validatedData.participantName,
              avatar_url: validatedData.avatarSeed ? `/api/avatar?name=${validatedData.avatarSeed}&variant=beam&palette=0` : null,
              is_anonymous: isAnonymous,
              is_admin: effectiveIsAdmin,
              current_count: currentParticipantCount + 1
            }
          });
      } catch (eventError) {
        console.error("Error logging participant join event:", eventError);
        // Don't block the join process if event logging fails
      }
      
      // Persist participant data to localStorage
      persistParticipantData({
        participantId: newParticipantId,
        conversationId,
        name: validatedData.participantName,
        avatarSeed: validatedData.avatarSeed,
        isAnonymous,
        isAdmin: effectiveIsAdmin
      });
      
      // Clear any existing "session full" errors since we've successfully joined
      setError(null);
      
      // Add a short delay to allow for Supabase to process the update
      setTimeout(() => {
        console.log("Navigating to session with admin status:", effectiveIsAdmin);
        navigateToSession(conversationId, validatedData.participantName, newParticipantId, validatedData.avatarSeed, effectiveIsAdmin);
      }, 500);
      
      return Promise.resolve();
    } catch (error: any) {
      console.error("Error joining session:", error);
      
      // Special handling for admin users - if they get an error about session being full,
      // always allow them to join anyway
      const isSessionFullError = error.message?.includes("full") || error.message?.includes("maximum capacity");
      const effectiveIsAdmin = forceAdmin || contextIsAdmin || sessionStorage.getItem('isAdminSession') === 'true';
      
      if (isSessionFullError && effectiveIsAdmin) {
        console.log("🔑 Admin override for session full error - forcing join success");
        
        // For admins, we'll still let them join with a special participant ID
        const adminParticipantId = Math.floor(Math.random() * 900) + 9000; // Use a very high ID for admin override
        
        await registerParticipant({
          conversationId: conversationId!, 
          participantId: adminParticipantId,
          participantName: sanitizeInput(participantName),
          avatarSeed: sanitizeInput(avatarSeed),
          isAnonymous,
          isAdmin: true // Force admin for this registration
        });
        
        // Persist admin participant data
        persistParticipantData({
          participantId: adminParticipantId,
          conversationId: conversationId!,
          name: sanitizeInput(participantName),
          avatarSeed: sanitizeInput(avatarSeed),
          isAnonymous,
          isAdmin: true
        });
        
        toast({
          title: "Admin Override",
          description: "Session is full, but you're joining as an admin.",
          variant: "default"
        });
        
        // Navigate with admin status
        setTimeout(() => {
          navigateToSession(conversationId, sanitizeInput(participantName), adminParticipantId, sanitizeInput(avatarSeed), true);
        }, 500);
        
        return Promise.resolve();
      }
      
      setError(error.message || "Failed to join the session");
      toast({
        title: "Error",
        description: error.message || "Failed to join the session. Please try again.",
        variant: "destructive",
      });
      setIsJoining(false);
      return Promise.resolve();
    }
  };

  return {
    isJoining: isJoining || isCheckingCapacity,
    error,
    joinSession,
    setError,
    persistedParticipantData
  };
}
