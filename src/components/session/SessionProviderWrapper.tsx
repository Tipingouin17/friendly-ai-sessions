
import React, { useState } from "react";
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
  const effectiveAdmin = isAdmin || forceAdmin || sessionStorage.getItem('isAdminSession') === 'true';
  const isOnAdminPath = window.location.pathname.includes('/admin');
  
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
              isAdmin: props.isAdmin || effectiveAdmin || isOnAdminPath
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
