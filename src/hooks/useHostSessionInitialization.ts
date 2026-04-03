/**
 * use Host Session Initialization
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "react-router-dom";

interface UseHostSessionInitializationProps {
  setHasInitializedProvider: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  currentConversationId: number | null;
  locationState: any;
  conversationData: any;
  participants: any[];
}

export const useHostSessionInitialization = ({
  setHasInitializedProvider,
  setIsLoading,
  currentConversationId,
  locationState,
  conversationData,
  participants
}: UseHostSessionInitializationProps) => {
  const { toast } = useToast();
  const location = useLocation();
  const initialRenderRef = useRef(true);

  // Track URL params for session switching
  useEffect(() => {
    setHasInitializedProvider(false);
    setIsLoading(true);
  }, [location.search, location.pathname, setHasInitializedProvider, setIsLoading]);

  // Log status on mount
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;

      toast({
        title: "Host Session Interface",
        description: "You are viewing the host interface. You can monitor and manage the session."
      });
    }
  }, [currentConversationId, locationState, conversationData, participants, toast]);

  return { initialRenderRef };
};
