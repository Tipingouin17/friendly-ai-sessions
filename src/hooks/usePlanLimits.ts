
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
  planName: string;
}

export const usePlanLimits = (): PlanLimits => {
  const { user } = useAuth();
  const { planRestrictions, plan, isLoading: planLoading } = useUserPlan();
  const { toast } = useToast();

  const { data: counts, isLoading: countsLoading } = useQuery({
    queryKey: ['userUsage', user?.id],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Get facilitator count (user-created custom facilitators only)
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

  // Handle unlimited values (null in database means unlimited; 999999 is also treated as unlimited)
  const rawFacilitatorLimit = planRestrictions?.facilitator_limit;
  const maxFacilitators = rawFacilitatorLimit === null
    ? Infinity
    : (rawFacilitatorLimit !== undefined && rawFacilitatorLimit >= 999999)
      ? Infinity
      : (rawFacilitatorLimit || 0);

  const rawSessionLimit = planRestrictions?.session_limit;
  const maxSessions = rawSessionLimit === null
    ? Infinity
    : (rawSessionLimit !== undefined && rawSessionLimit >= 999999)
      ? Infinity
      : (rawSessionLimit || 0);

  const rawParticipantLimit = planRestrictions?.max_participants;
  const maxParticipants = rawParticipantLimit === null
    ? Infinity
    : (rawParticipantLimit !== undefined && rawParticipantLimit >= 999999)
      ? Infinity
      : (rawParticipantLimit || 5);

  // Get the maximum questions per session with a default of 10
  // Treat very large values (999999+) as effectively unlimited
  const rawQuestionLimit = planRestrictions?.question_limit;
  const maxQuestionsPerSession = rawQuestionLimit === null
    ? Infinity
    : (rawQuestionLimit && rawQuestionLimit >= 999999)
      ? Infinity
      : (rawQuestionLimit || 10);

  // Check if the user can create custom facilitators based on the plan
  const canCreateCustomFacilitators = !!planRestrictions?.customisable_facilitators;

  // hasReachedFacilitatorLimit only applies when the user CAN create custom facilitators
  // and has reached their numeric limit. Free plan users cannot create custom facilitators
  // at all (canCreateCustomFacilitators = false), but this does NOT block them from
  // selecting pre-built facilitators — that is handled separately via canCreateCustomFacilitators.
  const hasReachedFacilitatorLimit = canCreateCustomFacilitators
    ? (maxFacilitators !== Infinity && (counts?.facilitatorCount || 0) >= maxFacilitators)
    : false;

  // For session limit, only show the limit reached message if there's a finite limit and we've reached it
  const hasReachedSessionLimit = maxSessions !== Infinity && (counts?.sessionCount || 0) >= maxSessions;

  return {
    hasReachedFacilitatorLimit,
    hasReachedSessionLimit,
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
    isLoading,
    planName: plan?.title || "Free Plan"
  };
};
