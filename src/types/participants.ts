
export interface SessionParticipant {
  id: number;
  conversation_id: number;
  name: string;
  avatar_seed: string | null;
  created_at?: string;
}
