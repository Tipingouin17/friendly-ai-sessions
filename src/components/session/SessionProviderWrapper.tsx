
import React, { useState, useEffect, useRef } from "react";
import { RefactoredSessionProvider } from "./RefactoredSessionProvider";
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
  
  // Enhanced path and context analysis for better view mode detection
  const currentPath = window.location.pathname;
  const urlParams = new URLSearchParams(window.location.search);
  
  // Detect admin/host routes more precisely
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
  
  // Determine the admin status once and store in ref to prevent loops
  if (!stateRef.current.adminStatusDetermined) {
    // Enhanced logic: Only treat as admin if explicitly on admin/host paths OR forced
    // Participant URLs with participant params should never be treated as admin
    stateRef.current.effectiveAdmin = (
      (forceAdmin || isAdmin || isOnAdminPath || isOnHostPath) && 
      !(hasParticipantParams && isParticipantPath)
    );
    stateRef.current.adminStatusDetermined = true;
    
    console.log("✅ SessionProviderWrapper - Admin status determined:", {
      effectiveAdmin: stateRef.current.effectiveAdmin,
      reasoning: {
        forceAdmin,
        isAdmin,
        isOnAdminPath,
        isOnHostPath,
        hasParticipantParams,
        isParticipantPath,
        finalDecision: stateRef.current.effectiveAdmin
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
    isOnAdminPath: isOnAdminPath || isOnHostPath
  });
  
  // CRITICAL FIX: Implement automatic retry for participants to ensure they can connect
  useEffect(() => {
    if (!sessionMountedRef.current) return;
    
    // Only run setup once using the ref to prevent re-renders
    if (stateRef.current.hasSetup) return;
    stateRef.current.hasSetup = true;
    
    // Auto-retry for participants only, not for admin routes
    if (isParticipantPath && !stateRef.current.hasToggledRetry && 
        !stateRef.current.effectiveAdmin && connectionAttempts === 0) {
      const retryTimeout = setTimeout(() => {
        if (!sessionMountedRef.current) return;
        
        console.log("🔄 Auto-retrying connection for participant");
        retryConnection();
        stateRef.current.hasToggledRetry = true;
      }, 3000); // Short timeout to ensure participants can connect
      
      return () => clearTimeout(retryTimeout);
    }
  }, [isParticipantPath, connectionAttempts, retryConnection, sessionMountedRef]);

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
          isOnAdminPath: isOnAdminPath || isOnHostPath,
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
        
        // Enhanced props with proper view mode detection
        const enhancedProps = {
          ...props,
          // CRITICAL: Ensure participants get participant view mode regardless of admin context
          sessionState: {
            ...props.sessionState,
            viewMode: (hasParticipantParams && isParticipantPath) ? "participant" as const : 
                     (stateRef.current.effectiveAdmin ? "admin" as const : props.sessionState.viewMode)
          },
          isAdmin: isParticipantPath ? props.isAdmin : (props.isAdmin || stateRef.current.effectiveAdmin)
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
    </RefactoredSessionProvider>
  );
};

export default SessionProviderWrapper;
