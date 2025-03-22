
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
  useEffect(() => {
    console.log("useSessionRealtimeConnection running...");
  }, []);

  // Set up realtime connection handling with better error handling
  const connection = useRealtimeConnectionHandler({
    conversationId,
    refetch,
    onConnectionError: (error) => {
      // Only pass errors to parent if not in admin mode
      if (!isAdmin && onError) {
        onError(error);
      } else if (isAdmin) {
        console.log("🔑 Suppressing connection error for admin user:", error);
      }
    }
  });
  
  // Return a safe connection object with defaults for any potentially undefined values
  return {
    isConnected: connection?.isConnected ?? false,
    connectionAttempts: connection?.connectionAttempts ?? 0,
    connectionError: connection?.connectionError ?? null
  };
}
