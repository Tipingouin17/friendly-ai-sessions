
import { useEffect, useRef } from "react";
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
  // Use a single ref to track all states
  const stateRef = useRef({
    hasHandledAdmin: false,
    hasInitialized: false,
    hasUpdatedLoading: false,
    hasHandledError: false,
    initTimeoutID: null as NodeJS.Timeout | null
  });
  
  // Set admin status only once per component lifecycle
  useEffect(() => {
    if (isOnAdminPath && sessionMountedRef.current && !stateRef.current.hasHandledAdmin) {
      stateRef.current.hasHandledAdmin = true;
      
      // Only set if not already set
      if (sessionStorage.getItem('isAdminSession') !== 'true') {
        sessionStorage.setItem('isAdminSession', 'true');
        console.log("useSessionWrapperEffects: Setting admin status for admin path (once)");
      }
    }
    
    return () => {
      if (stateRef.current.initTimeoutID) {
        clearTimeout(stateRef.current.initTimeoutID);
        stateRef.current.initTimeoutID = null;
      }
    };
  }, [isOnAdminPath, sessionMountedRef]);

  // Initialize session when data is available or for admin sessions - with protection against re-renders
  useEffect(() => {
    if (!sessionMountedRef.current || forcedInitialization.current || 
        providerInitialized.current || stateRef.current.hasInitialized) {
      return;
    }
    
    stateRef.current.hasInitialized = true;
    const isAdmin = effectiveAdmin || isOnAdminPath;
    
    // For admin sessions, initialize IMMEDIATELY
    if (isAdmin) {
      console.log("Admin session: Fast-tracked initialization in wrapper effects");
      providerInitialized.current = true;
      onInitialized();
      
      // Force loading to false with minimum delay for admin
      stateRef.current.initTimeoutID = setTimeout(() => {
        if (sessionMountedRef.current && !stateRef.current.hasUpdatedLoading) {
          stateRef.current.hasUpdatedLoading = true;
          onLoading(false);
        }
      }, 100);
      
      return;
    }
    
    // Initialize if we have conversation data or it's an admin session
    const shouldInitialize = isAdmin || 
                           (props.conversation && props.currentConversationId) || 
                           props.isSessionStartedInDB;
    
    if (shouldInitialize) {
      console.log("Provider successfully initialized with data");
      providerInitialized.current = true;
      onInitialized();
      
      // Set loading to false immediately for valid sessions
      if ((props.isSessionStartedInDB || props.conversation) && !stateRef.current.hasUpdatedLoading) {
        stateRef.current.hasUpdatedLoading = true;
        onLoading(false);
      }
    } else if (props.error) {
      console.log("Provider initialization with error:", props.error);
      providerInitialized.current = true;
      onInitialized();
    }
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, 
     props.isSessionStartedInDB, onInitialized, onLoading, effectiveAdmin, 
     isOnAdminPath, forcedInitialization, providerInitialized, sessionMountedRef]);

  // Loading state management - single update only
  useEffect(() => {
    const isAdmin = effectiveAdmin || isOnAdminPath;
    
    if (sessionMountedRef.current && isAdmin && props.isLoading && !stateRef.current.hasUpdatedLoading) {
      // For admin sessions, force loading to false only if currently loading
      stateRef.current.hasUpdatedLoading = true;
      onLoading(false);
    } else if (sessionMountedRef.current && 
              (props.isSessionStartedInDB || props.conversation) && 
              props.isLoading && !stateRef.current.hasUpdatedLoading) {
      // For participants, clear loading when data is available
      stateRef.current.hasUpdatedLoading = true;
      onLoading(false);
    }
  }, [props.isLoading, props.isSessionStartedInDB, props.conversation,
     effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

  // Handle errors from provider - suppress for admin
  useEffect(() => {
    if (props.error && sessionMountedRef.current && !stateRef.current.hasHandledError) {
      stateRef.current.hasHandledError = true;
      
      // For admin sessions, suppress ALL errors
      if (effectiveAdmin || isOnAdminPath) {
        console.log("🔑 Suppressing all errors for admin user: ", props.error);
      } else {
        onError(props.error);
      }
    }
  }, [props.error, onError, effectiveAdmin, isOnAdminPath, sessionMountedRef]);
}
