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

      // NOTE: refetch() was removed here — it is already called (with timeout)
      // in useJoinSessionData.handleJoinSession before joinSession() is invoked.
      // A second refetch here caused a double-timeout that blocked the join for
      // 30+ seconds when the Railway backend was slow (cold start).
      
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
          isAdmin: effectiveIsAdmin,
          conversation: conversation as any
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
      const rawMessage = error.message || "Failed to join the session";
      const isRevokedAccess = rawMessage.toLowerCase().includes('access') && rawMessage.toLowerCase().includes('revoked');
      const displayMessage = isRevokedAccess
        ? "Your access to this session has been revoked by the facilitator. Please contact the facilitator if you believe this was a mistake."
        : rawMessage;

      setError(displayMessage);
      toast({
        title: isRevokedAccess ? "Access revoked" : "Error",
        description: displayMessage,
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
