
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
        
        // Get plan restrictions from plan_restrictions table
        const { data: planRestrictions, error: restrictionsError } = await supabase
          .from('plan_restrictions')
          .select('*')
          .eq('plan_id', freePlan.id)
          .single();
        
        if (restrictionsError) {
          console.error("Error fetching plan restrictions:", restrictionsError);
          // Create default restrictions if none found
          const defaultRestrictions = {
            facilitator_limit: 1,
            session_limit: 3,
            max_participants: 10,
            customisable_sessions: false,
            customisable_facilitators: false,
            saved_sessions: false,
            session_reports: false,
            data_export: false,
            question_limit: 10
          };
          
          // Create a compatible plan object for the UI
          const planForUI: Plan = {
            id: freePlan.id,
            title: freePlan.title,
            price: freePlan.price || 0,
            plan_type: freePlan.plan_type || '',
            is_popular: freePlan.is_popular || false,
            stripe_plan_id: freePlan.stripe_plan_id || '',
            currency: freePlan.currency
          };
          
          return {
            currentPlanId: freePlan.id,
            plan: planForUI,
            planRestrictions: defaultRestrictions
          };
        }
        
        // Create the plan restrictions object from the plan restrictions table
        const planRestrictionsObj = {
          facilitator_limit: parseNumberOrNull(planRestrictions.facilitator_limit), 
          session_limit: parseNumberOrNull(planRestrictions.session_limit),
          max_participants: parseNumberOrNull(planRestrictions.max_participants),
          customisable_sessions: planRestrictions.customisable_sessions,
          customisable_facilitators: planRestrictions.customisable_facilitators,
          saved_sessions: planRestrictions.saved_sessions,
          session_reports: planRestrictions.session_reports,
          data_export: planRestrictions.data_export,
          question_limit: parseNumberOrNull(planRestrictions.question_limit) || 10
        };
        
        // Create a compatible plan object for the UI
        const planForUI: Plan = {
          id: freePlan.id,
          title: freePlan.title,
          price: freePlan.price || 0,
          plan_type: freePlan.plan_type || '',
          is_popular: freePlan.is_popular || false,
          stripe_plan_id: freePlan.stripe_plan_id || '',
          currency: freePlan.currency
        };
        
        return {
          currentPlanId: freePlan.id,
          plan: planForUI,
          planRestrictions: planRestrictionsObj
        };
      }
      
      // Get the plan details from the plans table
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', profileData.current_plan_id)
        .single();
      
      if (planError) throw planError;
      
      // Get plan restrictions from plan_restrictions table
      const { data: planRestrictions, error: restrictionsError } = await supabase
        .from('plan_restrictions')
        .select('*')
        .eq('plan_id', planData.id)
        .single();
      
      if (restrictionsError) {
        console.error("Error fetching plan restrictions:", restrictionsError);
        // Create default restrictions if none found
        const defaultRestrictions = {
          facilitator_limit: 1,
          session_limit: 3,
          max_participants: 10,
          customisable_sessions: false,
          customisable_facilitators: false,
          saved_sessions: false,
          session_reports: false,
          data_export: false,
          question_limit: 10
        };
        
        // Create a compatible plan object for the UI
        const planForUI: Plan = {
          id: planData.id,
          title: planData.title || '',
          price: planData.price || 0,
          plan_type: planData.plan_type || '',
          is_popular: planData.is_popular || false,
          stripe_plan_id: planData.stripe_plan_id || '',
          currency: planData.currency
        };
        
        return {
          currentPlanId: profileData.current_plan_id,
          plan: planForUI,
          planRestrictions: defaultRestrictions
        };
      }
      
      // Create the plan restrictions object from the plan restrictions table
      const planRestrictionsObj = {
        facilitator_limit: parseNumberOrNull(planRestrictions.facilitator_limit),
        session_limit: parseNumberOrNull(planRestrictions.session_limit),
        max_participants: parseNumberOrNull(planRestrictions.max_participants),
        customisable_sessions: planRestrictions.customisable_sessions,
        customisable_facilitators: planRestrictions.customisable_facilitators,
        saved_sessions: planRestrictions.saved_sessions,
        session_reports: planRestrictions.session_reports,
        data_export: planRestrictions.data_export,
        question_limit: parseNumberOrNull(planRestrictions.question_limit) || 10
      };

      // Create a compatible plan object for the UI
      const planForUI: Plan = {
        id: planData.id,
        title: planData.title || '',
        price: planData.price || 0,
        plan_type: planData.plan_type || '',
        is_popular: planData.is_popular || false,
        stripe_plan_id: planData.stripe_plan_id || '',
        currency: planData.currency
      };
      
      return {
        currentPlanId: profileData.current_plan_id,
        plan: planForUI,
        planRestrictions: planRestrictionsObj
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
