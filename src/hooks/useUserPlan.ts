
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plan } from "@/pages/pricing/types";

export interface UserPlanDetails {
  currentPlanId: number | null;
  plan: Plan | null;
  planRestrictions: {
    facilitator_limit: number | null;
    session_limit: number | null;
    max_participants: number | null;
    customisable_sessions: boolean | null;
    customisable_facilitators: boolean | null;
    saved_sessions: boolean | null;
    session_reports: boolean | null;
    data_export: boolean | null;
    question_limit?: number | null;
  } | null;
  isLoading: boolean;
  error: Error | null;
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
      
      if (!profileData?.current_plan_id) {
        // If no plan found, return default free plan (id 1)
        const { data: freePlan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('title', 'Free')
          .single();
          
        if (planError) throw planError;
        
        // Create empty plan_table_details if it doesn't exist
        const planTableDetails = freePlan.plan_table_details || {};
        
        // Create the plan restrictions object from the plan details
        const planRestrictions = {
          facilitator_limit: parseNumberOrNull(planTableDetails.no_of_facilitator), 
          session_limit: parseNumberOrNull(planTableDetails.no_of_sessions),
          max_participants: parseNumberOrNull(planTableDetails.max_participants),
          customisable_sessions: planTableDetails.customisable_sessions,
          customisable_facilitators: planTableDetails.customisable_facilitators,
          saved_sessions: planTableDetails.saved_sessions,
          session_reports: planTableDetails.session_reports,
          data_export: planTableDetails.data_export,
          question_limit: parseNumberOrNull(planTableDetails.number_of_questions_per_session) || 10
        };
        
        // Create a compatible plan object for the UI
        const planForUI: Plan = {
          id: freePlan.id,
          title: freePlan.title,
          price: freePlan.price || 0,
          plan_type: freePlan.plan_type || '',
          plan_table_details: {
            no_of_facilitator: planTableDetails.no_of_facilitator,
            no_of_sessions: planTableDetails.no_of_sessions,
            max_participants: planTableDetails.max_participants,
            customisable_sessions: planTableDetails.customisable_sessions,
            customisable_facilitators: planTableDetails.customisable_facilitators,
            saved_sessions: planTableDetails.saved_sessions,
            session_reports: planTableDetails.session_reports,
            data_export: planTableDetails.data_export,
            number_of_questions_per_session: planTableDetails.number_of_questions_per_session
          },
          is_popular: freePlan.is_popular || false,
          stripe_plan_id: freePlan.stripe_plan_id || '',
          currency: freePlan.currency
        };
        
        return {
          currentPlanId: freePlan.id,
          plan: planForUI,
          planRestrictions
        };
      }
      
      // Get the plan details from the plans table
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', profileData.current_plan_id)
        .single();
      
      if (planError) throw planError;
      
      // Create empty plan_table_details if it doesn't exist
      const planTableDetails = planData.plan_table_details || {};
      
      // Create the plan restrictions object from the plan details
      const planRestrictions = {
        facilitator_limit: parseNumberOrNull(planTableDetails.no_of_facilitator),
        session_limit: parseNumberOrNull(planTableDetails.no_of_sessions),
        max_participants: parseNumberOrNull(planTableDetails.max_participants),
        customisable_sessions: planTableDetails.customisable_sessions,
        customisable_facilitators: planTableDetails.customisable_facilitators,
        saved_sessions: planTableDetails.saved_sessions,
        session_reports: planTableDetails.session_reports,
        data_export: planTableDetails.data_export,
        question_limit: parseNumberOrNull(planTableDetails.number_of_questions_per_session) || 10
      };

      // Create a compatible plan object for the UI
      const planForUI: Plan = {
        id: planData.id,
        title: planData.title || '',
        price: planData.price || 0,
        plan_type: planData.plan_type || '',
        plan_table_details: {
          no_of_facilitator: planTableDetails.no_of_facilitator,
          no_of_sessions: planTableDetails.no_of_sessions,
          max_participants: planTableDetails.max_participants,
          customisable_sessions: planTableDetails.customisable_sessions,
          customisable_facilitators: planTableDetails.customisable_facilitators,
          saved_sessions: planTableDetails.saved_sessions,
          session_reports: planTableDetails.session_reports,
          data_export: planTableDetails.data_export,
          number_of_questions_per_session: planTableDetails.number_of_questions_per_session
        },
        is_popular: planData.is_popular || false,
        stripe_plan_id: planData.stripe_plan_id || '',
        currency: planData.currency
      };
      
      return {
        currentPlanId: profileData.current_plan_id,
        plan: planForUI,
        planRestrictions
      };
    },
    enabled: !!user,
  });

  // Helper function to parse numbers or null values
  function parseNumberOrNull(value: any): number | null {
    if (value === null) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  
  return {
    currentPlanId: data?.currentPlanId || null,
    plan: data?.plan || null,
    planRestrictions: data?.planRestrictions || null,
    isLoading,
    error: error as Error || null
  };
};
