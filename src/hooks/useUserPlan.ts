
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Plan } from "@/pages/pricing/types";

export interface UserPlanDetails {
  currentPlanId: number | null;
  plan: Plan | null;
  planRestrictions: {
    no_of_facilitator: number | null;
    no_of_sessions: number | null;
    max_participants: number | null;
    customisable_sessions: boolean | null;
    saved_sessions: boolean | null;
    session_reports: boolean | null;
    data_export: boolean | null;
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
        
        const { data: freePlanRestrictions, error: restrictionsError } = await supabase
          .from('plan_restrictions')
          .select('*')
          .eq('plan_id', freePlan.id)
          .single();
          
        if (restrictionsError) throw restrictionsError;
        
        return {
          currentPlanId: freePlan.id,
          plan: freePlan,
          planRestrictions: freePlanRestrictions
        };
      }
      
      // Get the plan and its restrictions
      const { data: plan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', profileData.current_plan_id)
        .single();
      
      if (planError) throw planError;
      
      const { data: planRestrictions, error: restrictionsError } = await supabase
        .from('plan_restrictions')
        .select('*')
        .eq('plan_id', profileData.current_plan_id)
        .single();
      
      if (restrictionsError) throw restrictionsError;
      
      return {
        currentPlanId: profileData.current_plan_id,
        plan,
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
