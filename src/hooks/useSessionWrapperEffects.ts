
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
  // Always set admin status if detected
  useEffect(() => {
    if (effectiveAdmin || isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin, isOnAdminPath]);

  // Initialize session when data is available
  useEffect(() => {
    if (sessionMountedRef.current && !forcedInitialization.current && !providerInitialized.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      
      // For admin sessions, initialize immediately regardless of other conditions
      if (isAdmin) {
        console.log("Admin session: Fast-tracked initialization");
        providerInitialized.current = true;
        onInitialized();
        onLoading(false); // Set loading to false immediately for admin
        return;
      }
      
      // Initialize immediately if we have conversation data or it's an admin session
      const shouldInitialize = isAdmin || (props.conversation && props.currentConversationId) || props.isSessionStartedInDB;
      
      if (shouldInitialize) {
        console.log("Provider successfully initialized with data:", {
          conversationId: props.currentConversationId,
          hasData: !!props.conversation,
          isAdmin: props.isAdmin,
          effectiveAdmin,
          isOnAdminPath,
          isSessionStarted: props.isSessionStartedInDB
        });
        providerInitialized.current = true;
        onInitialized();
        
        // Set loading to false immediately if session is started
        if (props.isSessionStartedInDB) {
          onLoading(false);
        }
      } else if (props.error) {
        console.log("Provider initialization with error:", props.error);
        providerInitialized.current = true;
        onInitialized();
      }
    }
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, props.isSessionStartedInDB]);

  // Update loading state based on conditions
  useEffect(() => {
    if (sessionMountedRef.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      
      if (isAdmin) {
        // For admin sessions, fast-track the loading state to false
        onLoading(false);
      } else {
        // For participants, clear loading when session is started
        if (props.isSessionStartedInDB) {
          console.log("Session started, clearing loading state for participant");
          onLoading(false);
        } else {
          onLoading(props.isLoading);
        }
      }
    }
  }, [props.isLoading, props.isAdmin, props.isSessionStartedInDB, effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

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
