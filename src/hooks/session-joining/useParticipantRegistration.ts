
import { supabase } from "@/integrations/supabase/client";

interface RegisterParticipantParams {
  conversationId: number;
  participantId: number;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
  isAdmin?: boolean;
}

export async function registerParticipant({
  conversationId,
  participantId,
  participantName,
  avatarSeed,
  isAnonymous = false,
  isAdmin = false
}: RegisterParticipantParams): Promise<void> {
  try {
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        conversation_id: conversationId,
        participant_id: participantId,
        name: participantName,
        avatar_seed: avatarSeed,
        is_anonymous: isAnonymous || false,
        is_admin: isAdmin || false
      });
      
    if (participantError) {
      console.error("Error storing participant info:", participantError);
      // Continue anyway - this is not critical for joining
    }
  } catch (err) {
    // Catch any error from the insert operation but continue
    console.error("Exception storing participant info:", err);
  }
}
