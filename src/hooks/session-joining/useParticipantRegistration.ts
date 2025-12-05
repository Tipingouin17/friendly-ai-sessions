
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
    console.log("=== REGISTER PARTICIPANT START ===");
    console.log(`Registering participant ${participantId} for conversation ${conversationId}`);
    console.log("Participant details:", { participantName, avatarSeed, isAnonymous, isAdmin, isHost });

    // Insert into session_participants table
    console.log("Attempting to insert into session_participants table...");
    const insertData = {
      conversation_id: conversationId,
      participant_id: participantId,
      name: participantName,
      avatar_seed: avatarSeed,
      is_anonymous: isAnonymous,
      is_host: isHost || isAdmin // Map isAdmin to isHost for compatibility
    };
    console.log("Insert data:", insertData);

    const { error: insertError } = await supabase
      .from('session_participants')
      .insert(insertData);

    if (insertError) {
      console.error('❌ Error inserting participant:', insertError);
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      });
      throw insertError;
    }
    console.log("✅ Participant inserted successfully");

    // FIXED: Update the conversation participant count to match actual participants
    // This ensures data consistency after successful participant registration
    console.log("Fetching current participant count...");
    const { data: participantCount, error: countError } = await supabase
      .from('session_participants')
      .select('participant_id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    if (countError) {
      console.error('⚠️ Error getting participant count:', countError);
    } else {
      const actualCount = participantCount?.length || 0;
      console.log(`Current participant count: ${actualCount}`);
      console.log(`Updating conversation ${conversationId} participant count to ${actualCount}`);

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ current_participants: actualCount })
        .eq('id', conversationId);

      if (updateError) {
        console.error('⚠️ Error updating participant count:', updateError);
      } else {
        console.log(`✅ Successfully updated participant count to ${actualCount}`);
      }
    }

    console.log(`✅ Successfully registered participant ${participantId}`);
    console.log("=== REGISTER PARTICIPANT END ===");
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to register participant:', error);
    throw error;
  }
};
