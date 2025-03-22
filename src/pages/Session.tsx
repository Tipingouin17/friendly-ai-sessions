
import React from "react";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import { useSessionPageEffects } from "@/hooks/useSessionPageEffects";
import SessionContent from "@/components/session/SessionContent";

const Session = () => {
  // Get session state from our custom hook
  const {
    isLoading,
    setIsLoading,
    hasInitializedProvider,
    sessionStarted,
    handleError,
    handleSessionFull,
    retryConnection,
    handleProviderInitialized,
    stateRef,
    isOnAdminPath
  } = useSessionPageState();
  
  // Set up session page effects
  const { sessionMountedRef } = useSessionPageEffects({
    isLoading,
    hasInitializedProvider,
    setIsLoading,
    retryConnection,
    isAdmin: stateRef.current.isAdmin,
    isOnAdminPath
  });

  // Render the session page with SessionContent component
  return (
    <SessionContent
      isLoading={isLoading}
      hasInitializedProvider={hasInitializedProvider}
      sessionStarted={sessionStarted}
      error={stateRef.current.error}
      noSessionFound={stateRef.current.noSessionFound}
      connectionAttempts={stateRef.current.connectionAttempts}
      isAdmin={stateRef.current.isAdmin}
      sessionMountedRef={sessionMountedRef}
      handleProviderInitialized={handleProviderInitialized}
      setIsLoading={setIsLoading}
      handleError={handleError}
      handleSessionFull={handleSessionFull}
      retryConnection={retryConnection}
      forceAdmin={isOnAdminPath}
    />
  );
};

export default Session;
