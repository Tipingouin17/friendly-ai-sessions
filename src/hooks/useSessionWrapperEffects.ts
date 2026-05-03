/**
 * use Session Wrapper Effects
 *
 * Hook for the AIfacilitator application.
 */

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
    if (!sessionMountedRef.current) return;
    
    if (isOnAdminPath && !stateRef.current.hasHandledAdmin) {
      stateRef.current.hasHandledAdmin = true;
      
      // Only set if not already set
      if (sessionStorage.getItem('isAdminSession') !== 'true') {
        sessionStorage.setItem('isAdminSession', 'true');
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
    if (!sessionMountedRef.current || 
        forcedInitialization.current || 
        providerInitialized.current || 
        stateRef.current.hasInitialized) {
      return;
    }
    
    // Only run this effect once
    stateRef.current.hasInitialized = true;
    const isAdmin = effectiveAdmin || isOnAdminPath;
    
    // For admin sessions, initialize IMMEDIATELY
    if (isAdmin) {
      providerInitialized.current = true;
      onInitialized();
      
      // Force loading to false with minimum delay for admin
      stateRef.current.initTimeoutID = setTimeout(() => {
        if (!sessionMountedRef.current) return;
        
        if (!stateRef.current.hasUpdatedLoading) {
          stateRef.current.hasUpdatedLoading = true;
          onLoading(false);
        }
      }, 100);
      
      return;
    }
    
    // CRITICAL FIX: Always initialize for participant routes with valid session ID
    const urlParams = new URLSearchParams(window.location.search);
    const hasSessionId = urlParams.has('id') && urlParams.get('id');
    
    // Initialize if we have conversation data or it's a participant with valid session ID
    const shouldInitialize = isAdmin || 
                           hasSessionId || 
                           (props.conversation && props.currentConversationId) || 
                           props.isSessionStartedInDB;
    
    if (shouldInitialize) {
      providerInitialized.current = true;
      onInitialized();
      
      // PERF FIX: For participants with a valid session ID in the URL, call
      // onLoading(false) immediately — the ParticipantLoadingShell handles all
      // subsequent loading states (connecting → waiting_host → ai_generating).
      // Previously we waited for props.conversation to be non-null, which kept
      // the page-level isLoading=true and blocked SessionStateRenderer from
      // rendering SessionStateHandler at all, adding 1-3s of blank loading.
      if (!stateRef.current.hasUpdatedLoading) {
        stateRef.current.hasUpdatedLoading = true;
        onLoading(false);
      }
    } else if (props.error) {
      providerInitialized.current = true;
      onInitialized();
    }
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, 
     props.isSessionStartedInDB, onInitialized, onLoading, effectiveAdmin, 
     isOnAdminPath, forcedInitialization, providerInitialized, sessionMountedRef]);

  // Loading state management - single update only
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    const isAdmin = effectiveAdmin || isOnAdminPath;
    // Check for valid session ID
    const urlParams = new URLSearchParams(window.location.search);
    const hasSessionId = urlParams.has('id') && urlParams.get('id');
    
    if (isAdmin && props.isLoading && !stateRef.current.hasUpdatedLoading) {
      // For admin sessions, force loading to false only if currently loading
      stateRef.current.hasUpdatedLoading = true;
      onLoading(false);
    } else if ((props.isSessionStartedInDB || props.conversation || hasSessionId) && 
              props.isLoading && !stateRef.current.hasUpdatedLoading) {
      // For participants, clear loading when data is available
      stateRef.current.hasUpdatedLoading = true;
      onLoading(false);
    }
  }, [props.isLoading, props.isSessionStartedInDB, props.conversation,
     effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

  // Handle errors from provider - suppress for admin
  useEffect(() => {
    if (!sessionMountedRef.current || !props.error || stateRef.current.hasHandledError) return;
    
    stateRef.current.hasHandledError = true;
    
    // For admin sessions, suppress ALL errors
    if (effectiveAdmin || isOnAdminPath) { /* no-op */ } else {
      onError(props.error);
    }
  }, [props.error, onError, effectiveAdmin, isOnAdminPath, sessionMountedRef]);
}
