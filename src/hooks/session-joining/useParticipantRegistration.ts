/**
 * use Participant Registration
 *
 * Session joining hook for the AIfacilitator application.
 */

import api from "@/lib/api";

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

    // Insert into session_participants table
    const insertData = {
      conversation_id: conversationId,
      participant_id: participantId,
      name: participantName,
      avatar_seed: avatarSeed,
      is_anonymous: isAnonymous,
      is_host: isHost || isAdmin // Map isAdmin to isHost for compatibility
    };

    const { error: insertError } = await api
      .from('session_participants')
      .insert(insertData);

    if (insertError) {
      console.error('Error inserting participant:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw insertError;
    }

    // FIXED: Update the conversation participant count to match actual participants
    // This ensures data consistency after successful participant registration
    const { data: participantCount, error: countError } = await api
      .from('session_participants')
      .select('participant_id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.error('Error getting participant count:', countError);
    } else {
      const actualCount = participantCount?.length || 0;

      const { error: updateError } = await api
        .from('conversations')
        .update({ current_participants: actualCount })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating participant count:', updateError);
      } else { /* no-op */ }
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to register participant:', error);
    throw error;
  }
};
