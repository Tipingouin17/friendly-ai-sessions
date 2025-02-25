
import { Json } from "@/integrations/supabase/types";

export interface Plan {
  id: number;
  title: string;
  price: number;
  plan_type: string;
  plan_details: Json;
  plan_table_details: Json;
  is_popular: boolean;
  stripe_plan_id: string;
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
