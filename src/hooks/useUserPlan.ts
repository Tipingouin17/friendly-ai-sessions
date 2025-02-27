
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
          .from('plan_features')
          .select('*')
          .eq('title', 'Free')
          .single();
          
        if (planError) throw planError;
        
        // Create the plan restrictions object from the plan features
        const planRestrictions = {
          facilitator_limit: freePlan.facilitator_limit,
          session_limit: freePlan.session_limit,
          max_participants: freePlan.max_participants,
          customisable_sessions: freePlan.customisable_sessions,
          customisable_facilitators: freePlan.customisable_facilitators,
          saved_sessions: freePlan.saved_sessions,
          session_reports: freePlan.session_reports,
          data_export: freePlan.data_export,
          // Use default value of 10 if the field doesn't exist in the database
          question_limit: 10
        };
        
        return {
          currentPlanId: freePlan.id,
          plan: {
            id: freePlan.id,
            title: freePlan.title,
            price: freePlan.price,
            plan_type: freePlan.plan_type,
            plan_table_details: planRestrictions,
            is_popular: freePlan.is_popular,
            stripe_plan_id: freePlan.stripe_plan_id,
            currency: freePlan.currency
          },
          planRestrictions
        };
      }
      
      // Get the plan features from the view
      const { data: planFeatures, error: planError } = await supabase
        .from('plan_features')
        .select('*')
        .eq('id', profileData.current_plan_id)
        .single();
      
      if (planError) throw planError;
      
      // Create the plan restrictions object from the plan features
      const planRestrictions = {
        facilitator_limit: planFeatures.facilitator_limit,
        session_limit: planFeatures.session_limit,
        max_participants: planFeatures.max_participants,
        customisable_sessions: planFeatures.customisable_sessions,
        customisable_facilitators: planFeatures.customisable_facilitators,
        saved_sessions: planFeatures.saved_sessions,
        session_reports: planFeatures.session_reports,
        data_export: planFeatures.data_export,
        // Use default value of 10 if the field doesn't exist in the database
        question_limit: 10
      };
      
      return {
        currentPlanId: profileData.current_plan_id,
        plan: {
          id: planFeatures.id,
          title: planFeatures.title,
          price: planFeatures.price,
          plan_type: planFeatures.plan_type,
          plan_table_details: planRestrictions,
          is_popular: planFeatures.is_popular,
          stripe_plan_id: planFeatures.stripe_plan_id,
          currency: planFeatures.currency
        },
        planRestrictions
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
