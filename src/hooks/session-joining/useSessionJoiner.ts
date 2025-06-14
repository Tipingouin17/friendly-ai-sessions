
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
import { useNavigateToSession } from "./useNavigateToSession";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { useSessionValidation } from "./useSessionValidation";
import { useParticipantJoining } from "./useParticipantJoining";
import { useAdminOverride } from "./useAdminOverride";

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

export function useSessionJoiner() {
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
  const { navigateToSession } = useNavigateToSession();
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  const { persistedParticipantData } = useParticipantPersistence();
  
  const { validateSessionJoin, error, setError } = useSessionValidation();
  const { handleExistingParticipant, joinAsNewParticipant } = useParticipantJoining();
  const { handleAdminOverride } = useAdminOverride();

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
      const validatedData = await validateSessionJoin({
        conversationId,
        participantName,
        avatarSeed,
        isAnonymous
      });

      if (!validatedData) {
        return Promise.resolve();
      }

      // Check if we have persisted data for this conversation
      const existingParticipant = conversationId ? 
        await handleExistingParticipant(conversationId, validatedData.participantName, validatedData.avatarSeed) : 
        null;
      
      if (existingParticipant) {
        // Navigate directly using persisted data
        setTimeout(() => {
          navigateToSession(
            conversationId!, 
            existingParticipant.name, 
            existingParticipant.participantId, 
            existingParticipant.avatarSeed,
            existingParticipant.isAdmin
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
      
      try {
        // Try to join as new participant
        const joinResult = await joinAsNewParticipant({
          conversationId,
          participantName: validatedData.participantName,
          avatarSeed: validatedData.avatarSeed,
          currentParticipantCount,
          isAnonymous,
          isAdmin: effectiveIsAdmin
        });
        
        // Clear any existing "session full" errors since we've successfully joined
        setError(null);
        
        // Add a short delay to allow for Supabase to process the update
        setTimeout(() => {
          console.log("Navigating to session with admin status:", joinResult.isAdmin);
          navigateToSession(
            conversationId, 
            joinResult.name, 
            joinResult.participantId, 
            joinResult.avatarSeed, 
            joinResult.isAdmin
          );
        }, 500);
        
        return Promise.resolve();
        
      } catch (joinError: any) {
        // Special handling for admin users - if they get an error about session being full,
        // always allow them to join anyway
        const isSessionFullError = joinError.message?.includes("full") || joinError.message?.includes("maximum capacity");
        
        if (isSessionFullError && effectiveIsAdmin) {
          const adminResult = await handleAdminOverride({
            conversationId,
            participantName: validatedData.participantName,
            avatarSeed: validatedData.avatarSeed,
            isAnonymous
          });
          
          // Navigate with admin status
          setTimeout(() => {
            navigateToSession(
              conversationId, 
              adminResult.name, 
              adminResult.participantId, 
              adminResult.avatarSeed, 
              adminResult.isAdmin
            );
          }, 500);
          
          return Promise.resolve();
        }
        
        throw joinError;
      }
      
    } catch (error: any) {
      console.error("Error joining session:", error);
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
    isJoining,
    error,
    joinSession,
    setError,
    persistedParticipantData
  };
}
