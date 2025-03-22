
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserPlan } from "./useUserPlan";
import { useToast } from "@/components/ui/use-toast";

export interface PlanLimits {
  hasReachedFacilitatorLimit: boolean;
  hasReachedSessionLimit: boolean;
  hasReachedParticipantLimit: boolean;
  canCreateCustomSessions: boolean;
  canCreateCustomFacilitators: boolean;
  canExportData: boolean;
  canSaveSessions: boolean;
  canGenerateReports: boolean;
  isLoading: boolean;
  maxParticipants: number;
  maxFacilitators: number;
  maxSessions: number;
  maxQuestionsPerSession: number;
  currentFacilitatorCount: number;
  currentSessionCount: number;
}

export const usePlanLimits = (): PlanLimits => {
  const { user } = useAuth();
  const { planRestrictions, isLoading: planLoading } = useUserPlan();
  const { toast } = useToast();
  
  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['userUsage', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      
      // Get facilitator count
      const { count: facilitatorCount, error: facilitatorError } = await supabase
        .from('facilitators')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (facilitatorError) {
        toast({
          title: "Error",
          description: "Failed to fetch facilitator count",
          variant: "destructive",
        });
        throw facilitatorError;
      }
      
      // Get session count
      const { count: sessionCount, error: sessionError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (sessionError) {
        toast({
          title: "Error",
          description: "Failed to fetch session count",
          variant: "destructive",
        });
        throw sessionError;
      }
      
      return {
        facilitatorCount: facilitatorCount || 0,
        sessionCount: sessionCount || 0
      };
    },
    enabled: !!user && !planLoading,
  });
  
  const isLoading = planLoading || countsLoading;
  
  // Handle unlimited values (null in database means unlimited)
  const maxFacilitators = planRestrictions?.facilitator_limit === null ? Infinity : (planRestrictions?.facilitator_limit || 0);
  const maxSessions = planRestrictions?.session_limit === null ? Infinity : (planRestrictions?.session_limit || 0);
  const maxParticipants = planRestrictions?.max_participants === null ? Infinity : (planRestrictions?.max_participants || 0);
  
  // Get the maximum questions per session with a default of 10
  const maxQuestionsPerSession = planRestrictions?.question_limit === null 
    ? Infinity 
    : (planRestrictions?.question_limit || 10);
  
  // Check if the user can create custom facilitators based on the plan_table_details
  const canCreateCustomFacilitators = !!planRestrictions?.customisable_facilitators;
  
  // Check both the count limit and whether custom facilitators are allowed
  const hasReachedFacilitatorLimit = !canCreateCustomFacilitators || ((counts?.facilitatorCount || 0) >= maxFacilitators);
  
  return {
    hasReachedFacilitatorLimit,
    hasReachedSessionLimit: (counts?.sessionCount || 0) >= maxSessions,
    hasReachedParticipantLimit: false, // This will be checked when selecting participants
    maxParticipants,
    maxFacilitators,
    maxSessions,
    maxQuestionsPerSession,
    currentFacilitatorCount: counts?.facilitatorCount || 0,
    currentSessionCount: counts?.sessionCount || 0,
    canCreateCustomSessions: !!planRestrictions?.customisable_sessions,
    canCreateCustomFacilitators,
    canExportData: !!planRestrictions?.data_export,
    canSaveSessions: !!planRestrictions?.saved_sessions,
    canGenerateReports: !!planRestrictions?.session_reports,
    isLoading
  };
};
