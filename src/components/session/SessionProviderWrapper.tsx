
import React, { useState, useEffect, useRef } from "react";
import { RefactoredSessionProvider } from "./RefactoredSessionProvider";
import { SessionContextProps } from "@/types/session";
import SessionStateRenderer from "./SessionStateRenderer";
import { useSessionProviderInitialization } from "@/hooks/useSessionProviderInitialization";
import { useSessionProviderAdmin } from "@/hooks/useSessionProviderAdmin";
import { useSessionWrapperInitialization } from "@/hooks/useSessionWrapperInitialization";
import { useSessionWrapperEffects } from "@/hooks/useSessionWrapperEffects";

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
    hasToggledRetry: false
  });
  
  // Check URL path to distinguish between admin and participant routes
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminPath;
  
  // CRITICAL FIX: For participant paths, don't use admin status from session storage
  // This prevents admin session conflicts with participant sessions
  const effectiveAdmin = isParticipantPath ? 
                       (isAdmin || forceAdmin) : 
                       (isAdmin || forceAdmin || sessionStorage.getItem('isAdminSession') === 'true' || isOnAdminPath);
  
  // Use admin status management hook
  useSessionProviderAdmin({ forceAdmin: effectiveAdmin || isOnAdminPath });

  // Use initialization hook
  const { forcedInitialization } = useSessionProviderInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    isAdmin: effectiveAdmin || isOnAdminPath,
    forceAdmin: effectiveAdmin || isOnAdminPath
  });

  // Use wrapper initialization hook
  const { providerInitialized } = useSessionWrapperInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    effectiveAdmin,
    isOnAdminPath
  });
  
  // CRITICAL FIX: Implement automatic retry for participants to ensure they can connect
  useEffect(() => {
    // Only run setup once using the ref to prevent re-renders
    if (stateRef.current.hasSetup) return;
    stateRef.current.hasSetup = true;
    
    // Auto-retry for participants only, not for admin routes
    if (isParticipantPath && !stateRef.current.hasToggledRetry && !effectiveAdmin && connectionAttempts === 0) {
      const retryTimeout = setTimeout(() => {
        console.log("Auto-retrying connection for participant");
        retryConnection();
        stateRef.current.hasToggledRetry = true;
      }, 3000); // Short timeout to ensure participants can connect
      
      return () => clearTimeout(retryTimeout);
    }
  }, [isParticipantPath, effectiveAdmin, connectionAttempts, retryConnection]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={effectiveAdmin || isOnAdminPath}
    >
      {(props: SessionContextProps) => {
        // Use wrapper effects hook
        useSessionWrapperEffects({
          props,
          effectiveAdmin,
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
            isAdmin: props.isAdmin || effectiveAdmin || isOnAdminPath
          });
        }
        
        // Render appropriate state based on current conditions
        return (
          <SessionStateRenderer
            props={{
              ...props,
              isAdmin: isParticipantPath ? props.isAdmin : (props.isAdmin || effectiveAdmin || isOnAdminPath)
            }}
            isLoading={props.isLoading}
            error={error}
            effectiveAdmin={effectiveAdmin || isOnAdminPath}
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
