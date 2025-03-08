
import { Database } from "@/integrations/supabase/types";

export type DbConversation = Database["public"]["Tables"]["conversations"]["Row"];
export type DbSession = Database["public"]["Tables"]["sessions"]["Row"];
export type DbFacilitator = Database["public"]["Tables"]["facilitators"]["Row"];

// Define the exact shape of facilitator details we're selecting in our query
export interface FacilitatorDetails {
  id: number;
  title: string | null;
  profile_picture: string | null;
  details: string | null;
}

export interface ConversationWithSession extends DbConversation {
  sessions: {
    id: number;
    title: string | null;
    objective: string | null;
    welcome_message: string | null;
    facilitator: number;
    facilitator_details: FacilitatorDetails;
  } | null;
  session_started?: boolean;
}

export interface Workshop extends DbConversation {
  sessions: {
    title: string | null;
    facilitator: number | null;
  } | null;
}
