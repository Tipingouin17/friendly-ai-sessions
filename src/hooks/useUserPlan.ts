/**
 * use User Plan
 *
 * Hook for the AIfacilitator application.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plan } from "@/pages/pricing/types";

export interface PlanRestrictions {
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
}

export interface UserPlanDetails {
  currentPlanId: number | null;
  plan: Plan | null;
  planRestrictions: PlanRestrictions | null;
  isLoading: boolean;
  error: Error | null;
}

// Helper function to parse numbers or null values
function parseNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// Default restrictions for Free plan fallback — used whenever the DB query fails
// or returns no data. Matches the plan_restrictions row for plan_id=1 (Free).
const DEFAULT_FREE_RESTRICTIONS: PlanRestrictions = {
  facilitator_limit: 2,
  session_limit: 5,
  max_participants: 10,
  question_limit: 10,
  customisable_sessions: false,
  customisable_facilitators: false,
  saved_sessions: false,
  session_reports: false,
  data_export: false,
  priority_support: false,
  custom_branding: false,
};

function mapRestrictions(r: Record<string, unknown>): PlanRestrictions {
  return {
    facilitator_limit: parseNumberOrNull(r.facilitator_limit),
    session_limit: parseNumberOrNull(r.session_limit),
    max_participants: parseNumberOrNull(r.max_participants),
    question_limit: parseNumberOrNull(r.question_limit) ?? 10,
    customisable_sessions: (r.customisable_sessions as boolean) ?? false,
    customisable_facilitators: (r.customisable_facilitators as boolean) ?? false,
    saved_sessions: (r.saved_sessions as boolean) ?? false,
    session_reports: (r.session_reports as boolean) ?? false,
    data_export: (r.data_export as boolean) ?? false,
    priority_support: (r.priority_support as boolean) ?? false,
    custom_branding: (r.custom_branding as boolean) ?? false,
  };
}

function mapPlanForUI(planData: Record<string, unknown>): Plan {
  return {
    id: planData.id as number,
    title: (planData.title as string) || '',
    price: (planData.price as number) || 0,
    plan_type: (planData.plan_type as string) || '',
    is_popular: (planData.is_popular as boolean) || false,
    stripe_plan_id: (planData.stripe_plan_id as string) || '',
    currency: planData.currency as string | undefined,
  };
}

export const useUserPlan = (): UserPlanDetails => {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['userPlan', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      try {
        // Step 1: Get the user's current plan from their profile.
        // Use maybeSingle() so a missing profile row returns null instead of throwing.
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('current_plan_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.warn("useUserPlan: profiles query failed, using Free defaults", profileError);
          return { currentPlanId: null, plan: null, planRestrictions: DEFAULT_FREE_RESTRICTIONS };
        }

        // Step 2: Determine which plan ID to use (default to Free plan if none set)
        let planId: number | null = (profileData as Record<string, unknown> | null)?.current_plan_id as number | null ?? null;

        if (!planId) {
          // Look up the Free plan by title
          const { data: freePlan, error: freePlanError } = await supabase
            .from('plans')
            .select('id')
            .eq('title', 'Free')
            .maybeSingle();

          if (freePlanError || !freePlan) {
            console.warn("useUserPlan: Free plan not found, using hardcoded defaults", freePlanError);
            return { currentPlanId: null, plan: null, planRestrictions: DEFAULT_FREE_RESTRICTIONS };
          }
          planId = (freePlan as Record<string, unknown>).id as number;
        }

        // Step 3: Get the plan details
        const { data: planData, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', planId)
          .maybeSingle();

        if (planError || !planData) {
          console.warn("useUserPlan: plan details not found, using Free defaults", planError);
          return { currentPlanId: planId, plan: null, planRestrictions: DEFAULT_FREE_RESTRICTIONS };
        }

        // Step 4: Get plan restrictions
        const { data: planRestrictions, error: restrictionsError } = await supabase
          .from('plan_restrictions')
          .select('*')
          .eq('plan_id', (planData as Record<string, unknown>).id)
          .maybeSingle();

        if (restrictionsError || !planRestrictions) {
          console.warn("useUserPlan: plan_restrictions not found, using Free defaults", restrictionsError);
          return {
            currentPlanId: planId,
            plan: mapPlanForUI(planData as Record<string, unknown>),
            planRestrictions: DEFAULT_FREE_RESTRICTIONS,
          };
        }

        return {
          currentPlanId: planId,
          plan: mapPlanForUI(planData as Record<string, unknown>),
          planRestrictions: mapRestrictions(planRestrictions as Record<string, unknown>),
        };
      } catch (err) {
        // Last-resort catch: never let the page crash — always return usable defaults
        console.error("useUserPlan: unexpected error, using Free defaults", err);
        return { currentPlanId: null, plan: null, planRestrictions: DEFAULT_FREE_RESTRICTIONS };
      }
    },
    enabled: !!user,
    // Retry once on failure before giving up
    retry: 1,
  });

  return {
    currentPlanId: data?.currentPlanId ?? null,
    plan: data?.plan ?? null,
    // Always return DEFAULT_FREE_RESTRICTIONS if data is not yet available —
    // this ensures maxSessions is never 0 due to a loading race.
    planRestrictions: data?.planRestrictions ?? (isLoading ? null : DEFAULT_FREE_RESTRICTIONS),
    isLoading,
    error: error as Error || null
  };
};
