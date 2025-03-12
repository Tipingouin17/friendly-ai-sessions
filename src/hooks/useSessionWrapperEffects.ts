
import { useEffect } from "react";
import { SessionContextProps } from "@/types/session";

interface UseSessionWrapperEffectsProps {
  props: SessionContextProps;
  effectiveAdmin: boolean;
  isOnAdminPath: boolean;
  forcedInitialization: React.MutableRefObject<boolean>;
  providerInitialized: React.MutableRefObject<boolean>;
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string) => void;
  sessionMountedRef: React.RefObject<boolean>;
}

export function useSessionWrapperEffects({
  props,
  effectiveAdmin,
  isOnAdminPath,
  forcedInitialization,
  providerInitialized,
  onInitialized,
  onLoading,
  onError,
  sessionMountedRef
}: UseSessionWrapperEffectsProps) {
  // Initialize session when data is available
  useEffect(() => {
    if (sessionMountedRef.current && !forcedInitialization.current && !providerInitialized.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      // Admin sessions initialize immediately
      const shouldInitialize = isAdmin || (props.conversation && props.currentConversationId);
      
      if (shouldInitialize) {
        console.log("Provider successfully initialized with data:", {
          conversationId: props.currentConversationId,
          hasData: !!props.conversation,
          isAdmin: props.isAdmin,
          effectiveAdmin,
          isOnAdminPath
        });
        providerInitialized.current = true;
        onInitialized();
        
        if (effectiveAdmin || isOnAdminPath) {
          sessionStorage.setItem('isAdminSession', 'true');
        }
      } else if (props.error) {
        console.log("Provider initialization with error:", props.error);
        providerInitialized.current = true;
        onInitialized();
      }
    }
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin]);

  // Update loading state based on conditions
  useEffect(() => {
    if (sessionMountedRef.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      
      if (isAdmin) {
        // For admin sessions, we're more lenient with loading states
        console.log("Admin session: Managing loading state");
        if (!props.isLoading) {
          onLoading(false);
        }
      } else {
        onLoading(props.isLoading);
      }
    }
  }, [props.isLoading, props.isAdmin, effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

  // Handle errors from provider
  useEffect(() => {
    if (props.error && sessionMountedRef.current) {
      const isSessionFullError = props.error.includes("full") || props.error.includes("maximum capacity");
      
      if (isSessionFullError && (effectiveAdmin || isOnAdminPath)) {
        console.log("🔑 Suppressing session full error for admin user");
      } else {
        onError(props.error);
      }
    }
  }, [props.error]);
}
