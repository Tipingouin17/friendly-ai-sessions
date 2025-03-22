
import { useEffect } from "react";
import { useRealtimeConnectionHandler } from "@/hooks/useRealtimeConnectionHandler";

interface UseSessionRealtimeConnectionProps {
  conversationId: number | null;
  refetch: () => void;
  onError?: (error: string) => void;
  isAdmin?: boolean;
}

export function useSessionRealtimeConnection({
  conversationId,
  refetch,
  onError,
  isAdmin
}: UseSessionRealtimeConnectionProps) {
  // Set up realtime connection handling
  const connection = useRealtimeConnectionHandler({
    conversationId,
    refetch,
    onConnectionError: onError
  });
  
  // Skip connection error handling for admin users
  useEffect(() => {
    if (isAdmin && connection.connectionError) {
      console.log("🔑 Suppressing connection errors for admin user");
    }
  }, [isAdmin, connection.connectionError]);
  
  return connection;
}
