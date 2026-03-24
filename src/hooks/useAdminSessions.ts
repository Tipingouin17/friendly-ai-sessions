
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { ConversationWithSession } from "@/types/database";

export function useAdminSessions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSessions, setActiveSessions] = useState<ConversationWithSession[]>([]);
  
  // Fetch active sessions for admin
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: async () => {
      try {
        
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
  
  // Set up real-time listener for conversations changes
  useEffect(() => {
    
    const channel = supabase
      .channel('admin-sessions-realtime')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations'
      }, (payload) => {
        
        // Check if the change affects session status
        if (payload.new && payload.old) {
          const newRecord = payload.new as any;
          const oldRecord = payload.old as any;
          
          // If session status changed (ended/started) or participant count changed
          if (newRecord.is_session_ended !== oldRecord.is_session_ended ||
              newRecord.status !== oldRecord.status ||
              newRecord.current_participants !== oldRecord.current_participants) {
            
            // Invalidate and refetch the admin sessions query
            queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
            
            // Also trigger a manual refetch for immediate update
            refetch();
          }
        }
      })
      .subscribe((status) => { /* no-op */ });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, refetch]);
  
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
