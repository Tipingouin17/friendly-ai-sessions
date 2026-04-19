/**
 * Session Content
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";

interface SessionContentProps {
  isLoading: boolean;
  hasInitializedProvider: boolean;
  sessionStarted: boolean;
  error: string | null;
  noSessionFound: boolean;
  connectionAttempts: number;
  isAdmin: boolean;
  sessionMountedRef: React.RefObject<boolean>;
  handleProviderInitialized: () => void;
  setIsLoading: (isLoading: boolean) => void;
  handleError: (error: string) => void;
  handleSessionFull: () => void;
  retryConnection: () => void;
  forceAdmin: boolean;
}

const SessionContent: React.FC<SessionContentProps> = ({
  isLoading,
  hasInitializedProvider,
  sessionStarted,
  error,
  noSessionFound,
  connectionAttempts,
  isAdmin,
  sessionMountedRef,
  handleProviderInitialized,
  setIsLoading,
  handleError,
  handleSessionFull,
  retryConnection,
  forceAdmin
}) => {
  return (
    <SessionErrorBoundary
      error={error}
      noSessionFound={noSessionFound}
      retryConnection={retryConnection}
      connectionAttempts={connectionAttempts}
      isLoading={isLoading}
      hasInitializedProvider={hasInitializedProvider}
      isAdmin={isAdmin}
      sessionMountedRef={sessionMountedRef}
    >
      {/* key={connectionAttempts} forces a full remount on every retry,
          which re-runs the React Query fetch and WebSocket connection */}
      <SessionProviderWrapper
        key={connectionAttempts}
        onInitialized={handleProviderInitialized}
        onLoading={setIsLoading}
        onError={handleError}
        handleSessionFull={handleSessionFull}
        retryConnection={retryConnection}
        connectionAttempts={connectionAttempts}
        error={error}
        sessionMountedRef={sessionMountedRef}
        isAdmin={isAdmin}
        forceAdmin={forceAdmin}
      />
    </SessionErrorBoundary>
  );
};

export default SessionContent;
