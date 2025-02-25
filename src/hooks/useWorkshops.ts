
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Workshop } from "@/types/facilitator";

export const useWorkshops = (facilitatorId: number | null) => {
  const { data: workshops = [], isLoading, error } = useQuery({
    queryKey: ['workshops', facilitatorId],
    queryFn: async () => {
      const query = supabase
        .from('sessions')
        .select(`
          *,
          facilitator:facilitators!inner(*),
          category:categories(*)
        `)
        .eq('status', true);

      if (facilitatorId) {
        query.eq('facilitator', facilitatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Workshop[];
    },
    enabled: facilitatorId !== null
  });

  const filterByType = (type: string) =>
    workshops.filter(w => w.session_type === type);

  const filterBySkillLevel = (level: string) =>
    workshops.filter(w => w.skill_level === level);

  const filterByDuration = (maxMinutes: number) =>
    workshops.filter(w => (w.duration_minutes || 0) <= maxMinutes);

  return {
    workshops,
    filterByType,
    filterBySkillLevel,
    filterByDuration,
    isLoading,
    error
  };
};
