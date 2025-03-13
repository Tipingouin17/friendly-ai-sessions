
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
    try {
      if (effectiveAdmin || isOnAdminPath) {
        sessionStorage.setItem('isAdminSession', 'true');
        console.log("useSessionWrapperEffects: Setting admin status");
      }
    } catch (e) {
      console.error("Error in admin status effect:", e);
    }
    
    // Return a noop function for cleanup
    return () => {};
  }, [effectiveAdmin, isOnAdminPath]);

  // Initialize session when data is available
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      if (sessionMountedRef.current && !forcedInitialization.current && !providerInitialized.current) {
        const isAdmin = effectiveAdmin || isOnAdminPath;
        
        // For admin sessions, initialize IMMEDIATELY regardless of other conditions
        if (isAdmin) {
          console.log("Admin session: Fast-tracked initialization in wrapper effects");
          providerInitialized.current = true;
          onInitialized();
          
          // Force loading to false with minimum delay for admin - CRITICAL
          timeoutId = setTimeout(() => {
            console.log("Admin session: Forcing loading to false");
            onLoading(false);
          }, 100);
          
          return () => {
            if (timeoutId !== null) {
              clearTimeout(timeoutId);
            }
          };
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
    } catch (e) {
      console.error("Error in session initialization effect:", e);
    }
    
    // Proper cleanup function
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [props.conversation, props.currentConversationId, props.error, props.isAdmin, 
     props.isSessionStartedInDB, onInitialized, onLoading, effectiveAdmin, 
     isOnAdminPath, forcedInitialization, providerInitialized, sessionMountedRef]);

  // More aggressive loading state management for admin sessions
  useEffect(() => {
    try {
      if (sessionMountedRef.current) {
        const isAdmin = effectiveAdmin || isOnAdminPath;
        
        if (isAdmin) {
          // For admin sessions, aggressively set loading to false
          console.log("Admin detected in wrapper effects, forcing loading to false");
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
    } catch (e) {
      console.error("Error in loading state effect:", e);
    }
    
    // Return a noop cleanup function
    return () => {};
  }, [props.isLoading, props.isAdmin, props.isSessionStartedInDB, 
     effectiveAdmin, isOnAdminPath, onLoading, sessionMountedRef]);

  // Handle errors from provider - suppress for admin
  useEffect(() => {
    try {
      if (props.error && sessionMountedRef.current) {
        // For admin sessions, we'll suppress ALL errors, not just session-full errors
        if (effectiveAdmin || isOnAdminPath) {
          console.log("🔑 Suppressing all errors for admin user: ", props.error);
        } else {
          onError(props.error);
        }
      }
    } catch (e) {
      console.error("Error in error handling effect:", e);
    }
    
    // Return a noop cleanup function
    return () => {};
  }, [props.error, onError, effectiveAdmin, isOnAdminPath, sessionMountedRef]);
}
