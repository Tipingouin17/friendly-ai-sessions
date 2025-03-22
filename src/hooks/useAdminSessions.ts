
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";

export function useAdminSessions() {
  const { toast } = useToast();
  const [activeSessions, setActiveSessions] = useState<ConversationWithSession[]>([]);
  
  // Fetch active sessions for admin
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      try {
        console.log("Fetching active sessions for admin");
        
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            sessions!conversations_sessions_id_fkey (
              id,
              title,
              objective,
              welcome_message,
              facilitator,
              facilitator_details:facilitators (
                id,
                title,
                profile_picture,
                details
              )
            )
          `)
          .eq('status', 'active')
          .eq('is_session_ended', false)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (error) {
          console.error('Error fetching active sessions:', error);
          throw new Error("Failed to load active sessions");
        }
        
        console.log('Found active sessions:', data?.length || 0);
        return data as ConversationWithSession[];
      } catch (error) {
        console.error('Error in query function:', error);
        throw error instanceof Error ? error : new Error("Failed to load active sessions");
      }
    },
    retry: 1,
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });
  
  // Set active sessions whenever data changes
  useEffect(() => {
    if (data) {
      setActiveSessions(data);
    }
  }, [data]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading sessions",
        description: error instanceof Error ? error.message : "Failed to load active sessions",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  const refreshSessions = () => {
    refetch();
  };
  
  return {
    activeSessions,
    isLoading,
    error,
    refreshSessions
  };
}
