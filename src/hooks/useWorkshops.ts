
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useWorkshops = (facilitatorId: number | null) => {
  return useQuery({
    queryKey: ['workshops', facilitatorId],
    queryFn: async () => {
      const query = supabase
        .from('sessions')
        .select('*, facilitator:facilitators!inner(*)')
        .eq('status', true);

      if (facilitatorId) {
        query.eq('facilitator', facilitatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: facilitatorId !== null
  });
};
