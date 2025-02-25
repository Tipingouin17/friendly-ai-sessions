
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Facilitator } from "@/types/facilitator";

export const useFacilitators = () => {
  const { data: facilitators = [], isLoading, error } = useQuery({
    queryKey: ['facilitators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilitators')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      return data as Facilitator[];
    }
  });

  const topFacilitators = facilitators
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  const filterByExpertise = (level: string) =>
    facilitators.filter(f => f.expertise_level === level);

  const filterByLanguage = (language: string) =>
    facilitators.filter(f => f.languages?.includes(language));

  return {
    facilitators,
    topFacilitators,
    filterByExpertise,
    filterByLanguage,
    isLoading,
    error
  };
};
