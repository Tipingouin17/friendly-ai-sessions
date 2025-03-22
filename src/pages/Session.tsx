
import React from "react";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import { useSessionPageEffects } from "@/hooks/useSessionPageEffects";
import SessionContent from "@/components/session/SessionContent";
import { useIsMobile } from "@/hooks/use-mobile";
import SessionMobileNav from "@/components/session/SessionMobileNav";

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
  
  // Check if we're on mobile
  const isMobile = useIsMobile();
  
  // Set up session page effects
  const { sessionMountedRef } = useSessionPageEffects({
    isLoading,
    hasInitializedProvider,
    setIsLoading,
    retryConnection,
    isAdmin: stateRef.current.isAdmin,
    isOnAdminPath
  });

  return (
    <>
      {/* Only show our custom navigation on mobile for participant view */}
      {isMobile && !isOnAdminPath && <SessionMobileNav />}
      
      <div className={isMobile && !isOnAdminPath ? "pt-16" : ""}>
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
      </div>
    </>
  );
};

export default Session;
