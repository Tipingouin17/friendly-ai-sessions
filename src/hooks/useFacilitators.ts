
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useFacilitators = () => {
  return useQuery({
    queryKey: ['facilitators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('facilitators')
        .select('*')
        .order('order', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });
};
