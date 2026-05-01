/**
 * use Workshop Reports
 *
 * Hook for the AIfacilitator application.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

export const useWorkshopReports = (conversationIds: number[]) => {
  return useQuery({
    queryKey: ['workshop-reports', conversationIds],
    queryFn: async () => {
      if (conversationIds.length === 0) return { /* no-op */ };
      
      const { data, error } = await api
        .from('session_reports')
        .select('conversation_id, report_content, metadata')
        .in('conversation_id', conversationIds);
      
      if (error) throw error;
      
      // Create a map of conversation_id to report data
      const reportsMap: Record<number, any> = { /* no-op */ };
      data?.forEach(report => {
        reportsMap[report.conversation_id] = report;
      });
      
      return reportsMap;
    },
    enabled: conversationIds.length > 0,
  });
};
