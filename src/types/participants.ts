/**
 * participants
 *
 * Type definitions for the AIfacilitator application.
 */

export interface SessionParticipant {
  id: number;
  conversation_id: number;
  name: string;
  avatar_seed: string | null;
  participant_id: number;
  created_at?: string;
  is_anonymous?: boolean;
}
