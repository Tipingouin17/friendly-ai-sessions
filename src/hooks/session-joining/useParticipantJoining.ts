
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { registerParticipant } from "./useParticipantRegistration";
import { useSessionCapacityCheck } from "./useSessionCapacityCheck";
import { useParticipantPersistence } from "@/hooks/useParticipantPersistence";
import { validateSessionAccess } from "@/utils/security/sessionValidation";

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

      // For existing participants, validate session access (anonymous access allowed)
      const hasAccess = await validateSessionAccess(conversationId);
      if (!hasAccess) {
        console.log("Session is no longer accessible (may be ended or inactive)");
        throw new Error("This session is no longer available");
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
    console.log("=== JOIN PROCESS START ===");
    console.log("Attempting to join session with ID:", conversationId);
    console.log("Participant name:", participantName);
    console.log("Current participant count before join:", currentParticipantCount);
    console.log("Admin status for capacity check:", isAdmin);
    console.log("Is anonymous:", isAnonymous);

    // Validate session access first (anonymous access allowed for active sessions)
    console.log("Step 1: Validating session access...");
    try {
      const hasAccess = await validateSessionAccess(conversationId);
      console.log("Session access validation result:", hasAccess);
      if (!hasAccess) {
        console.error("❌ Session access validation failed");
        throw new Error("This session is not available or has ended");
      }
      console.log("✅ Session access validated");
    } catch (accessError) {
      console.error("❌ Error during session access validation:", accessError);
      throw accessError;
    }

    // FIXED: Check capacity without updating count - count will be updated after successful registration
    console.log("Step 2: Checking session capacity...");
    let capacityResult;
    try {
      capacityResult = await checkCapacityAndUpdate(conversationId, isAdmin);
      console.log("Capacity check result:", capacityResult);
    } catch (capacityError) {
      console.error("❌ Error during capacity check:", capacityError);
      throw capacityError;
    }

    // If the session is full and we're not an admin, block joining
    if (!capacityResult.canJoin && !isAdmin) {
      console.error("❌ Join blocked - session at capacity:", capacityResult.error);
      throw new Error(capacityResult.error || "This session is full and cannot accept more participants.");
    }
    console.log("✅ Capacity check passed");

    // Use the returned participant count as the participant ID
    const newParticipantId = capacityResult.newParticipantId;
    console.log("Step 3: Assigned participant ID:", newParticipantId);

    // FIXED: Register participant first, which will handle count updates correctly
    console.log("Step 4: Registering participant...");
    try {
      await registerParticipant({
        conversationId,
        participantId: newParticipantId,
        participantName,
        avatarSeed,
        isAnonymous,
        isAdmin
      });
      console.log("✅ Participant registered successfully");
    } catch (registerError) {
      console.error("❌ Error registering participant:", registerError);
      throw registerError;
    }

    // Create a session_event to log the participant successfully joining
    console.log("Step 5: Logging participant join event...");
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
            timestamp: new Date().toISOString()
          }
        });
      console.log("✅ Successfully logged participant join event");
    } catch (eventError) {
      console.error("⚠️ Error logging participant join event:", eventError);
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
