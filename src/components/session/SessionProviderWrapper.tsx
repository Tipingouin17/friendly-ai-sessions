
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

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized = () => { },
  onLoading = () => { },
  onError = () => { },
  handleSessionFull = () => { },
  retryConnection = () => { },
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

  console.log("🔍 SessionProviderWrapper - Path Analysis:", {
    currentPath,
    isOnAdminPath,
    isOnHostPath,
    isParticipantPath,
    hasParticipantParams,
    forceAdmin,
    isAdmin
  });

  // Determine the effective admin/host status once and store in ref to prevent loops
  if (!stateRef.current.statusDetermined) {
    // CRITICAL FIX: Only treat as admin if explicitly on admin paths
    // Host paths should NOT set admin flags
    stateRef.current.effectiveAdmin = forceAdmin || isAdmin || isOnAdminPath;
    stateRef.current.effectiveHost = isOnHostPath;
    stateRef.current.statusDetermined = true;

    console.log("✅ SessionProviderWrapper - Status determined:", {
      effectiveAdmin: stateRef.current.effectiveAdmin,
      effectiveHost: stateRef.current.effectiveHost,
      reasoning: {
        forceAdmin,
        isAdmin,
        isOnAdminPath,
        isOnHostPath,
        hasParticipantParams,
        isParticipantPath
      }
    });
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

    // Only run setup once using the ref to prevent re-renders
    if (stateRef.current.hasSetup) return;
    stateRef.current.hasSetup = true;

    // Auto-retry for participants only, not for admin/host routes
    if (isParticipantPath && !stateRef.current.hasToggledRetry &&
      !stateRef.current.effectiveAdmin && !stateRef.current.effectiveHost &&
      connectionAttempts === 0) {
      const retryTimeout = setTimeout(() => {
        if (!sessionMountedRef.current) return;

        console.log("🔄 Auto-retrying connection for participant");
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
      {(props: SessionContextProps) => {
        // Use wrapper effects hook
        useSessionWrapperEffects({
          props,
          effectiveAdmin: stateRef.current.effectiveAdmin,
          isOnAdminPath: isOnAdminPath,
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

        // CRITICAL FIX: Always set participant view mode when participant params are present
        const enhancedProps = {
          ...props,
          sessionState: {
            ...props.sessionState,
            viewMode: hasParticipantParams ? "participant" as const :
              (stateRef.current.effectiveAdmin ? "admin" as const : props.sessionState.viewMode)
          },
          // IMPORTANT: Don't pass admin flags to participants
          isAdmin: hasParticipantParams ? false : (props.isAdmin || stateRef.current.effectiveAdmin)
        };

        console.log("🎯 SessionProviderWrapper - Enhanced Props:", {
          originalViewMode: props.sessionState?.viewMode,
          enhancedViewMode: enhancedProps.sessionState?.viewMode,
          isAdmin: enhancedProps.isAdmin,
          hasParticipantParams,
          isParticipantPath
        });

        // Render appropriate state based on current conditions
        return (
          <SessionStateRenderer
            props={enhancedProps}
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
    </SessionProvider>
  );
};

export default SessionProviderWrapper;
