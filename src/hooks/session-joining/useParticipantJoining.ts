
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useSessionCapacityCheck } from "./useSessionCapacityCheck";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { validateSessionAccess } from "@/utils/securityHelpers";

interface JoinParticipantParams {
  conversationId: number;
  participantName: string;
  avatarSeed: string;
  currentParticipantCount: number;
  isAnonymous?: boolean;
  isAdmin?: boolean;
}

export function useParticipantJoining() {
  const { toast } = useToast();
  const { checkCapacityAndUpdate } = useSessionCapacityCheck();
  const { 
    persistParticipantData, 
    getSessionByConversationId,
    updateSessionAccessTime
  } = useParticipantPersistence();

  const handleExistingParticipant = async (
    conversationId: number,
    participantName: string,
    avatarSeed: string
  ) => {
    const sessionData = getSessionByConversationId(conversationId);
    
    if (sessionData) {
      console.log("Using persisted participant data to rejoin session:", sessionData);
      
      // Validate session access
      const hasAccess = await validateSessionAccess(conversationId, sessionData.participantId?.toString());
      if (!hasAccess && !sessionData.isAdmin) {
        throw new Error("You don't have permission to access this session");
      }
      
      // Update the last accessed time
      updateSessionAccessTime(conversationId);
      
      // Show rejoining toast
      toast({
        title: "Rejoining Session",
        description: `Welcome back, ${sessionData.name || participantName}!`,
      });
      
      return {
        participantId: sessionData.participantId,
        name: sessionData.name || participantName,
        avatarSeed: sessionData.avatarSeed || avatarSeed,
        isAdmin: sessionData.isAdmin || false,
        isExistingParticipant: true
      };
    }
    
    return null;
  };

  const joinAsNewParticipant = async ({
    conversationId,
    participantName,
    avatarSeed,
    currentParticipantCount,
    isAnonymous = false,
    isAdmin = false
  }: JoinParticipantParams) => {
    console.log("Attempting to join session with ID:", conversationId);
    console.log("Current participant count before update:", currentParticipantCount);
    console.log("Admin status for capacity check:", isAdmin);
    
    // Check capacity BEFORE we try to update participant count - fixes race condition
    const capacityResult = await checkCapacityAndUpdate(conversationId, isAdmin);
    
    // If the session is full and we're not an admin, block joining
    if (!capacityResult.canJoin && !isAdmin) {
      throw new Error(capacityResult.error || "This session is full and cannot accept more participants.");
    }
    
    // Use the returned participant count as the participant ID
    const newParticipantId = capacityResult.newParticipantId;
    console.log("New participant ID:", newParticipantId);
    
    // Store the participant information in the session_participants table
    await registerParticipant({
      conversationId, 
      participantId: newParticipantId,
      participantName,
      avatarSeed,
      isAnonymous,
      isAdmin
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
            participant_name: participantName,
            avatar_url: avatarSeed ? `/api/avatar?name=${avatarSeed}&variant=beam&palette=0` : null,
            is_anonymous: isAnonymous,
            is_admin: isAdmin,
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
      name: participantName,
      avatarSeed,
      isAnonymous,
      isAdmin
    });
    
    return {
      participantId: newParticipantId,
      name: participantName,
      avatarSeed,
      isAdmin,
      isExistingParticipant: false
    };
  };

  return {
    handleExistingParticipant,
    joinAsNewParticipant
  };
}
