/**
 * use Session Joiner
 *
 * Session joining hook for the AIfacilitator application.
 */

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";
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

interface JoinResult {
  participantId: number;
  name: string;
  avatarSeed: string;
  isAdmin: boolean;
}

export function useSessionJoiner() {
  const { toast } = useToast();
  const [isJoining, setIsJoining] = useState(false);
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
  }: SessionJoinParams): Promise<JoinResult | null> => {
    try {
      // Validate input parameters
      const validatedData = await validateSessionJoin({
        conversationId,
        participantName,
        avatarSeed,
        isAnonymous
      });

      if (!validatedData) {
        return null;
      }

      // Check if we have persisted data for this conversation
      const existingParticipant = conversationId ? 
        await handleExistingParticipant(conversationId, validatedData.participantName, validatedData.avatarSeed) : 
        null;
      
      if (existingParticipant) {
        // Return existing participant data without navigation
        return {
          participantId: existingParticipant.participantId,
          name: existingParticipant.name,
          avatarSeed: existingParticipant.avatarSeed,
          isAdmin: false
        };
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
        
        return {
          participantId: joinResult.participantId,
          name: joinResult.name,
          avatarSeed: joinResult.avatarSeed,
          isAdmin: joinResult.isAdmin
        };
        
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
          
          return {
            participantId: adminResult.participantId,
            name: adminResult.name,
            avatarSeed: adminResult.avatarSeed,
            isAdmin: true
          };
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
      return null;
    } finally {
      setIsJoining(false);
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
