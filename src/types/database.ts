/**
 * database
 *
 * Type definitions for the AIfacilitator application.
 */

import { Database } from "@/integrations/supabase/types";

export type DbConversation = Database["public"]["Tables"]["conversations"]["Row"] & {
  session_started: boolean;
  is_session_ended?: boolean;
  participants: number;
};
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
}

export interface Workshop extends DbConversation {
  sessions: {
    title: string | null;
    facilitator: number | null;
    objective?: string | null;
    difficulty_level?: string | null;
    tags?: string[] | null;
    facilitators?: {
      title: string | null;
      profile_picture: string | null;
    } | null;
  } | null;
}
