
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

    // FIXED: Update the conversation participant count to match actual participants
    // This ensures data consistency after successful participant registration
    const { data: participantCount, error: countError } = await supabase
      .from('session_participants')
      .select('participant_id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.error('Error getting participant count:', countError);
    } else {
      const actualCount = participantCount?.length || 0;
      console.log(`Updating conversation ${conversationId} participant count to ${actualCount}`);
      
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: actualCount })
        .eq('id', conversationId);

      if (updateError) {
        console.error('Error updating participant count:', updateError);
      } else {
        console.log(`Successfully updated participant count to ${actualCount}`);
      }
    }

    console.log(`Successfully registered participant ${participantId}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to register participant:', error);
    throw error;
  }
};
