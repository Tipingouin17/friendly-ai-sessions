
import React, { useState, useEffect, useRef } from "react";
import { RefactoredSessionProvider } from "./RefactoredSessionProvider";
import { SessionContextProps } from "@/types/session";
import SessionStateRenderer from "./SessionStateRenderer";
import { useSessionProviderInitialization } from "@/hooks/useSessionProviderInitialization";
import { useSessionProviderAdmin } from "@/hooks/useSessionProviderAdmin";
import { useSessionWrapperInitialization } from "@/hooks/useSessionWrapperInitialization";
import { useSessionWrapperEffects } from "@/hooks/useSessionWrapperEffects";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

interface SessionProviderWrapperProps {
  onInitialized?: () => void;
  onLoading?: (isLoading: boolean) => void;
  onError?: (error: string) => void;
  handleSessionFull?: () => void;
  retryConnection?: () => void;
  connectionAttempts?: number;
  error?: string | null;
  sessionMountedRef?: React.RefObject<boolean>;
  isAdmin?: boolean;
  forceAdmin?: boolean;
  children?: (props: SessionContextProps) => React.ReactElement;
}

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized = () => {},
  onLoading = () => {},
  onError = () => {},
  handleSessionFull = () => {},
  retryConnection = () => {},
  connectionAttempts = 0,
  error = null,
  sessionMountedRef = { current: true },
  isAdmin = false,
  forceAdmin = false,
  children
}) => {
  const [sessionStarted, setSessionStarted] = useState(false);
  // Use ref for tracking setup and retries to prevent re-renders
  const stateRef = useRef({
    hasSetup: false,
    hasToggledRetry: false,
    adminStatusDetermined: false,
    effectiveAdmin: false
  });
  
  // Get admin status from our hook
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  
  // Check URL path to distinguish between admin and participant routes
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminPath;
  
  // Determine the admin status once and store in ref to prevent loops
  if (!stateRef.current.adminStatusDetermined) {
    stateRef.current.effectiveAdmin = isAdmin || forceAdmin || contextIsAdmin || isOnAdminPath;
    stateRef.current.adminStatusDetermined = true;
    
    // Log it once
    console.log("SessionProviderWrapper admin status determined:", {
      isAdmin, 
      forceAdmin, 
      contextIsAdmin, 
      isOnAdminPath,
      effectiveAdmin: stateRef.current.effectiveAdmin
    });
  }
  
  // Use admin status management hook - with safeguards to prevent loops
  useSessionProviderAdmin({ forceAdmin: stateRef.current.effectiveAdmin });

  // Use initialization hook
  const { forcedInitialization } = useSessionProviderInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    isAdmin: stateRef.current.effectiveAdmin,
    forceAdmin: stateRef.current.effectiveAdmin
  });

  // Use wrapper initialization hook
  const { providerInitialized } = useSessionWrapperInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    effectiveAdmin: stateRef.current.effectiveAdmin,
    isOnAdminPath
  });
  
  // CRITICAL FIX: Implement automatic retry for participants to ensure they can connect
  useEffect(() => {
    // Only run setup once using the ref to prevent re-renders
    if (stateRef.current.hasSetup) return;
    stateRef.current.hasSetup = true;
    
    // Auto-retry for participants only, not for admin routes
    if (isParticipantPath && !stateRef.current.hasToggledRetry && 
        !stateRef.current.effectiveAdmin && connectionAttempts === 0) {
      const retryTimeout = setTimeout(() => {
        console.log("Auto-retrying connection for participant");
        retryConnection();
        stateRef.current.hasToggledRetry = true;
      }, 3000); // Short timeout to ensure participants can connect
      
      return () => clearTimeout(retryTimeout);
    }
  }, [isParticipantPath, connectionAttempts, retryConnection]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={stateRef.current.effectiveAdmin}
    >
      {(props: SessionContextProps) => {
        // Use wrapper effects hook
        useSessionWrapperEffects({
          props,
          effectiveAdmin: stateRef.current.effectiveAdmin,
          isOnAdminPath,
          forcedInitialization,
          providerInitialized,
          onInitialized,
          onLoading,
          onError,
          sessionMountedRef
        });

        // If custom children are provided, render them with enhanced props
        if (children) {
          return children({
            ...props,
            isAdmin: props.isAdmin || stateRef.current.effectiveAdmin
          });
        }
        
        // Render appropriate state based on current conditions
        return (
          <SessionStateRenderer
            props={{
              ...props,
              isAdmin: isParticipantPath ? props.isAdmin : (props.isAdmin || stateRef.current.effectiveAdmin)
            }}
            isLoading={props.isLoading}
            error={error}
            effectiveAdmin={stateRef.current.effectiveAdmin}
            retryConnection={retryConnection}
            connectionAttempts={connectionAttempts}
            sessionStarted={sessionStarted}
            setSessionStarted={setSessionStarted}
            handleSessionFull={handleSessionFull}
          />
        );
      }}
    </RefactoredSessionProvider>
  );
};

export default SessionProviderWrapper;
