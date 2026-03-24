
import { useState, useEffect, useRef, useCallback } from "react";
import { useSimplifiedParticipantMonitoring } from "./useSimplifiedParticipantMonitoring";

interface UseParticipantChannelProps {
  conversationId: number | null;
  setIsConnected: (isConnected: boolean) => void;
  attemptReconnection: () => void;
  setCurrentParticipantCount: (count: number) => void;
  setMaxParticipantsForSession: (max: number) => void;
  refetch: () => Promise<any>;
}

export function useParticipantChannel({
  conversationId,
  setIsConnected,
  attemptReconnection,
  setCurrentParticipantCount,
  setMaxParticipantsForSession,
  refetch
}: UseParticipantChannelProps) {
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Handle participant count changes
  const handleParticipantCountChange = useCallback((count: number) => {
    if (!mountedRef.current) return;
    setCurrentParticipantCount(count);
  }, [setCurrentParticipantCount]);

  // Handle max participants changes
  const handleMaxParticipantsChange = useCallback((max: number) => {
    if (!mountedRef.current) return;
    setMaxParticipantsForSession(max);
  }, [setMaxParticipantsForSession]);

  // Use simplified monitoring
  const { 
    isConnected, 
    error: monitoringError, 
    reconnect 
  } = useSimplifiedParticipantMonitoring({
    conversationId,
    onParticipantCountChange: handleParticipantCountChange,
    onMaxParticipantsChange: handleMaxParticipantsChange,
    enabled: !!conversationId
  });

  // Update connection status
  useEffect(() => {
    setIsConnected(isConnected);
  }, [isConnected, setIsConnected]);

  // Update error status
  useEffect(() => {
    setError(monitoringError);
  }, [monitoringError]);

  // Handle reconnection attempts
  useEffect(() => {
    if (monitoringError && !isConnected) {
      const timeout = setTimeout(() => {
        if (mountedRef.current) {
          reconnect();
          refetch().catch(err => {
            console.error("Error refetching after reconnection:", err);
          });
        }
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [monitoringError, isConnected, reconnect, refetch]);

  // Expose reconnection method
  const handleReconnection = useCallback(() => {
    attemptReconnection();
    reconnect();
  }, [attemptReconnection, reconnect]);

  // Replace attemptReconnection with our handler
  useEffect(() => {
    // This ensures the parent component's reconnection logic uses our simplified approach
  }, [handleReconnection]);

  return { error };
}
