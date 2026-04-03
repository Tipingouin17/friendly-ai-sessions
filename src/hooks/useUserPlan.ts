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

// Default restrictions for Free plan fallback
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
      
      // Get the user's current plan from their profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('current_plan_id')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Determine which plan ID to use (default to Free plan if none set)
      let planId = profileData?.current_plan_id;
      
      if (!planId) {
        // Look up the Free plan
        const { data: freePlan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('title', 'Free')
          .single();
          
        if (planError) throw planError;
        planId = freePlan.id;
      }
      
      // Get the plan details
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();
      
      if (planError) throw planError;
      
      // Get plan restrictions
      const { data: planRestrictions, error: restrictionsError } = await supabase
        .from('plan_restrictions')
        .select('*')
        .eq('plan_id', planData.id)
        .single();
      
      if (restrictionsError) {
        console.error("Error fetching plan restrictions:", restrictionsError);
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
    },
    enabled: !!user,
  });
  
  return {
    currentPlanId: data?.currentPlanId || null,
    plan: data?.plan || null,
    planRestrictions: data?.planRestrictions || null,
    isLoading,
    error: error as Error || null
  };
};
