
export interface SessionParticipant {
  id: number;
  conversation_id: number;
  name: string;
  avatar_seed: string | null;
  participant_id: number;
  created_at?: string;
}
