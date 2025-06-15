
import { supabase } from "@/integrations/supabase/client";

export interface RegisterParticipantParams {
  conversationId: number;
  participantId: number;
  participantName: string;
  avatarSeed: string;
  isAnonymous?: boolean;
  isAdmin?: boolean; // Keep for backward compatibility
  isHost?: boolean; // New host property
}

export interface ParticipantSessionData {
  participantId: number;
  conversationId: number;
  name: string;
  avatarSeed: string;
  isAnonymous: boolean;
  isAdmin?: boolean; // Keep for backward compatibility
  isHost?: boolean; // New host property
  timestamp: string;
  lastAccessedAt: string;
}

export const registerParticipant = async ({
  conversationId,
  participantId,
  participantName,
  avatarSeed,
  isAnonymous = false,
  isAdmin = false,
  isHost = false
}: RegisterParticipantParams) => {
  try {
    console.log(`Registering participant ${participantId} for conversation ${conversationId}`);
    
    // Insert into session_participants table
    const { error: insertError } = await supabase
      .from('session_participants')
      .insert({
        conversation_id: conversationId,
        participant_id: participantId,
        name: participantName,
        avatar_seed: avatarSeed,
        is_anonymous: isAnonymous,
        is_host: isHost || isAdmin // Map isAdmin to isHost for compatibility
      });

    if (insertError) {
      console.error('Error inserting participant:', insertError);
      throw insertError;
    }

    // Update conversation participant count
    const { error: updateError } = await supabase.rpc('validate_participant_capacity', {
      conv_id: conversationId
    });

    if (updateError) {
      console.error('Error validating participant capacity:', updateError);
      throw updateError;
    }

    console.log(`Successfully registered participant ${participantId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to register participant:', error);
    throw error;
  }
};
