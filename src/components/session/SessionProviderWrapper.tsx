/**
 * Session Provider Wrapper
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useEffect, useRef } from "react";
import { SessionProvider } from "./SessionProvider";
import { SessionContextProps } from "@/types/session";
import SessionStateRenderer from "./SessionStateRenderer";
import { useSessionProviderInitialization } from "@/hooks/useSessionProviderInitialization";
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

/**
 * Inner component that receives session props and can safely call hooks.
 * This solves the rules-of-hooks violation where useSessionWrapperEffects
 * was being called inside a render callback.
 */
const SessionProviderInner: React.FC<{
  props: SessionContextProps;
  effectiveAdmin: boolean;
  isOnAdminPath: boolean;
  forcedInitialization: boolean;
  providerInitialized: boolean;
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string) => void;
  sessionMountedRef: React.RefObject<boolean>;
  hasParticipantParams: boolean;
  isParticipantPath: boolean;
  error: string | null;
  retryConnection: () => void;
  connectionAttempts: number;
  sessionStarted: boolean;
  setSessionStarted: React.Dispatch<React.SetStateAction<boolean>>;
  handleSessionFull: () => void;
  children?: (props: SessionContextProps) => React.ReactElement;
}> = ({
  props,
  effectiveAdmin,
  isOnAdminPath,
  forcedInitialization,
  providerInitialized,
  onInitialized,
  onLoading,
  onError,
  sessionMountedRef,
  hasParticipantParams,
  isParticipantPath,
  error,
  retryConnection,
  connectionAttempts,
  sessionStarted,
  setSessionStarted,
  handleSessionFull,
  children
}) => {
  // Now this hook is called at the top level of a component, not in a callback
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
      isAdmin: props.isAdmin || effectiveAdmin
    });
  }

  // Set participant view mode when participant params are present
  const enhancedProps = {
    ...props,
    sessionState: {
      ...props.sessionState,
      viewMode: hasParticipantParams ? "participant" as const :
        (effectiveAdmin ? "admin" as const : props.sessionState.viewMode)
    },
    isAdmin: hasParticipantParams ? false : (props.isAdmin || effectiveAdmin)
  };

  return (
    <SessionStateRenderer
      props={enhancedProps}
      isLoading={props.isLoading}
      error={error}
      effectiveAdmin={effectiveAdmin}
      retryConnection={retryConnection}
      connectionAttempts={connectionAttempts}
      sessionStarted={sessionStarted}
      setSessionStarted={setSessionStarted}
      handleSessionFull={handleSessionFull}
    />
  );
};

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized = () => { /* no-op */ },
  onLoading = () => { /* no-op */ },
  onError = () => { /* no-op */ },
  handleSessionFull = () => { /* no-op */ },
  retryConnection = () => { /* no-op */ },
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
    statusDetermined: false,
    effectiveAdmin: false,
    effectiveHost: false
  });

  // Enhanced path and context analysis
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);

  // Detect different route types
  const isOnAdminPath = currentPath.includes('/admin');
  const isOnHostPath = currentPath.includes('/host');
  const isParticipantPath = currentPath.includes('/session') && !isOnAdminPath && !isOnHostPath;

  // Check for participant-specific URL parameters
  const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');

  // Determine the effective admin/host status once and store in ref to prevent loops
  if (!stateRef.current.statusDetermined) {
    stateRef.current.effectiveAdmin = forceAdmin || isAdmin || isOnAdminPath;
    stateRef.current.effectiveHost = isOnHostPath;
    stateRef.current.statusDetermined = true;
  }

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
    isOnAdminPath: isOnAdminPath
  });

  // Auto-retry for participants to ensure they can connect
  useEffect(() => {
    if (!sessionMountedRef.current) return;

    if (stateRef.current.hasSetup) return;
    stateRef.current.hasSetup = true;

    if (isParticipantPath && !stateRef.current.hasToggledRetry &&
      !stateRef.current.effectiveAdmin && !stateRef.current.effectiveHost &&
      connectionAttempts === 0) {
      const retryTimeout = setTimeout(() => {
        if (!sessionMountedRef.current) return;
        retryConnection();
        stateRef.current.hasToggledRetry = true;
      }, 3000);

      return () => clearTimeout(retryTimeout);
    }
  }, [isParticipantPath, connectionAttempts, retryConnection, sessionMountedRef]);

  return (
    <SessionProvider
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={stateRef.current.effectiveAdmin}
    >
      {(props: SessionContextProps) => (
        <SessionProviderInner
          props={props}
          effectiveAdmin={stateRef.current.effectiveAdmin}
          isOnAdminPath={isOnAdminPath}
          forcedInitialization={forcedInitialization}
          providerInitialized={providerInitialized}
          onInitialized={onInitialized}
          onLoading={onLoading}
          onError={onError}
          sessionMountedRef={sessionMountedRef}
          hasParticipantParams={hasParticipantParams}
          isParticipantPath={isParticipantPath}
          error={error}
          retryConnection={retryConnection}
          connectionAttempts={connectionAttempts}
          sessionStarted={sessionStarted}
          setSessionStarted={setSessionStarted}
          handleSessionFull={handleSessionFull}
          children={children}
        />
      )}
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
