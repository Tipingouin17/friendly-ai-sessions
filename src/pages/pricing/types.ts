/**
 * types
 *
 * Page for the AIfacilitator application.
 */


export interface Plan {
  id: number;
  title: string;
  price: number;
  plan_type: string;
  plan_table_details?: {
    facilitator_limit: number | null;
    session_limit: number | null;
    max_participants: number | null;
    question_limit: number | null;
    customisable_sessions: boolean | null;
    customisable_facilitators: boolean | null;
    saved_sessions: boolean | null;
    session_reports: boolean | null;
    data_export: boolean | null;
    priority_support: boolean | null;
    custom_branding: boolean | null;
  };
  is_popular: boolean;
  stripe_plan_id: string;
  currency?: string;
}

export const FEATURE_LABELS: Record<string, string> = {
  facilitator_limit: "Number of Facilitators",
  session_limit: "Sessions Per Month",
  max_participants: "Maximum Participants",
  question_limit: "Questions Per Session",
  customisable_sessions: "Customizable Sessions",
  customisable_facilitators: "Customizable Facilitators",
  saved_sessions: "Save Sessions",
  session_reports: "Session Reports",
  data_export: "Data Export",
  priority_support: "Priority Support",
  custom_branding: "Custom Branding"
};

export const allFeatures = Object.keys(FEATURE_LABELS);
