/**
 * use Host Sessions
 *
 * Hook for the AIfacilitator application.
 */
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export function useHostSessions() {
  const {
    data: activeSessions = [],
    isLoading,
    refetch: refreshSessions
  } = useQuery({
    queryKey: ['host-sessions'],
    queryFn: async () => {
      const { data, error } = await api
        .from('conversations')
        .select(`
          *,
          sessions!conversations_sessions_id_fkey (
            title,
            facilitator,
            objective
          )
        `)
        .eq('is_session_ended', false)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active sessions:', error);
        throw error;
      }
      return data || [];
    },
    // Active sessions change frequently — 30s staleTime matches the refetch interval
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  });

  return {
    activeSessions,
    isLoading,
    refreshSessions
  };
}
