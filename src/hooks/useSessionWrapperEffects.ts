
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
  // Always set admin status only for admin paths
  useEffect(() => {
    if (isOnAdminPath) {
      sessionStorage.setItem('isAdminSession', 'true');
      console.log("useSessionWrapperEffects: Setting admin status for admin path");
    }
  }, [isOnAdminPath]);

  // Initialize session when data is available or for admin sessions
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (sessionMountedRef.current && !forcedInitialization.current && !providerInitialized.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      
      // For admin sessions, initialize IMMEDIATELY
      if (isAdmin) {
        console.log("Admin session: Fast-tracked initialization in wrapper effects");
        providerInitialized.current = true;
        onInitialized();
        
        // Force loading to false with minimum delay for admin
        timeoutId = setTimeout(() => {
          onLoading(false);
        }, 100);
        
        return () => {
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }
        };
      }
      
      // Initialize if we have conversation data or it's an admin session
      const shouldInitialize = isAdmin || (props.conversation && props.currentConversationId) || props.isSessionStartedInDB;
      
      if (shouldInitialize) {
        console.log("Provider successfully initialized with data");
        providerInitialized.current = true;
        onInitialized();
        
        // Set loading to false immediately for valid sessions
        if (props.isSessionStartedInDB || props.conversation) {
          onLoading(false);
        }
      } else if (props.error) {
        console.log("Provider initialization with error:", props.error);
        providerInitialized.current = true;
        onInitialized();
      }
    }
    
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, 
     props.isSessionStartedInDB, onInitialized, onLoading, effectiveAdmin, 
     isOnAdminPath, forcedInitialization, providerInitialized, sessionMountedRef]);

  // More aggressive loading state management for admin
  useEffect(() => {
    if (sessionMountedRef.current) {
      const isAdmin = effectiveAdmin || isOnAdminPath;
      
      if (isAdmin) {
        // For admin sessions, always force loading to false
        onLoading(false);
      } else if (props.isSessionStartedInDB || props.conversation) {
        // For participants, clear loading when data is available
        onLoading(false);
      }
    }
  }, [props.isLoading, props.isSessionStartedInDB, props.conversation,
     effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

  // Handle errors from provider - suppress for admin
  useEffect(() => {
    if (props.error && sessionMountedRef.current) {
      // For admin sessions, suppress ALL errors
      if (effectiveAdmin || isOnAdminPath) {
        console.log("🔑 Suppressing all errors for admin user: ", props.error);
      } else {
        onError(props.error);
      }
    }
  }, [props.error, onError, effectiveAdmin, isOnAdminPath, sessionMountedRef]);
}
