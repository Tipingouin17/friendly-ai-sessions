
import { ParticipantInfo } from "@/types/chat";
import { SessionParticipant } from "@/types/participants";

export const getParticipantInfo = (participant: any): ParticipantInfo => {
  const id = participant.participant_id || participant.id;
  const name = participant.name || `Participant ${id}`;
  let avatar = null;
  
  if (participant.avatar_seed) {
    // Generate avatar URL correctly
    avatar = `/api/avatar?name=${encodeURIComponent(participant.avatar_seed)}&variant=beam&palette=0`;
  }
  
  return {
    id,
    name,
    avatar
  };
};

export const getCurrentParticipantId = (
  locationState: { participantId?: number; isGuest?: boolean } | null,
  conversation: any
): number | null => {
  // If this is a guest user, return their participant id from location state
  if (locationState?.isGuest && locationState?.participantId) {
    return locationState.participantId;
  }
  
  // For host users, assume they're participant 1
  return 1;
};
