
import { Json } from "@/integrations/supabase/types";

export interface Plan {
  id: number;
  title: string;
  price: number;
  plan_type: string;
  plan_table_details: {
    no_of_facilitator: number | string | null;
    no_of_sessions: number | string | null;
    max_participants: number | string | null;
    customisable_sessions: boolean | null;
    customisable_facilitators: boolean | null;
    saved_sessions: boolean | null;
    session_reports: boolean | null;
    data_export: boolean | null;
  };
  is_popular: boolean;
  stripe_plan_id: string;
  currency?: string;
}

export const FEATURE_LABELS: Record<string, string> = {
  no_of_facilitator: "Number of Facilitators",
  no_of_sessions: "Number of Sessions",
  max_participants: "Maximum Participants",
  customisable_sessions: "Customizable Sessions",
  saved_sessions: "Save Sessions",
  session_reports: "Session Reports",
  data_export: "Data Export"
};

export const allFeatures = Object.keys(FEATURE_LABELS);
