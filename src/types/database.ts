
import { Database } from "@/integrations/supabase/types";

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"] & {
  sessions: {
    id: number;
    title: string;
    objective: string;
    welcome_message: string;
    facilitator: number;
    facilitator: {
      id: number;
      title: string;
      profile_picture: string;
      details: string;
    };
  };
};

export type Workshop = Database["public"]["Tables"]["conversations"]["Row"] & {
  sessions: {
    title: string;
    facilitator: number;
  };
};
