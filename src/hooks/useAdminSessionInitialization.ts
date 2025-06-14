
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useLocation } from "react-router-dom";

interface UseAdminSessionInitializationProps {
  setHasInitializedProvider: (value: boolean) => void;
  setIsLoading: (value: boolean) => void;
  currentConversationId: number | null;
  locationState: any;
  conversationData: any;
  participants: any[];
}

export const useAdminSessionInitialization = ({
  setHasInitializedProvider,
  setIsLoading,
  currentConversationId,
  locationState,
  conversationData,
  participants
}: UseAdminSessionInitializationProps) => {
  const { toast } = useToast();
  const location = useLocation();
  const initialRenderRef = useRef(true);

  // Track URL params for session switching
  useEffect(() => {
    console.log("Location or conversation ID changed in SessionAdmin");
    setHasInitializedProvider(false);
    setIsLoading(true);
    sessionStorage.setItem('isAdminSession', 'true');
  }, [location.search, location.pathname, setHasInitializedProvider, setIsLoading]);

  // Set admin status in session storage immediately
  useEffect(() => {
    sessionStorage.setItem('isAdminSession', 'true');
    console.log("Admin session confirmed on mount");
  }, []);

  // Log status on mount
  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      console.log("Admin session page mounted", {
        time: new Date().toISOString(),
        isAdmin: true,
        currentConversationId,
        locationState,
        conversationData,
        path: window.location.pathname,
        participantsCount: participants?.length || 0
      });

      sessionStorage.setItem('isAdminSession', 'true');

      toast({
        title: "Admin Session Interface",
        description: "You are viewing the admin interface. You can monitor and manage the session."
      });
    }
  }, [currentConversationId, locationState, conversationData, participants, toast]);

  return { initialRenderRef };
};
