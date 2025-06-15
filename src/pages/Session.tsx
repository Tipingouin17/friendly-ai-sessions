
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
    isOnAdminPath,
    isClient
  } = useSessionPageState();
  
  // Check if we're on mobile (will be undefined during hydration)
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

  // Show mobile nav only when we know we're on mobile and not admin
  const showMobileNav = isClient && isMobile && !isOnAdminPath;

  return (
    <div className="flex flex-col h-screen">
      {/* Mobile navigation container - always present for consistent DOM structure */}
      <div className={`${showMobileNav ? 'block' : 'hidden'}`}>
        <SessionMobileNav />
      </div>
      
      <div className={`flex-1 overflow-hidden ${showMobileNav ? 'pt-16' : ''}`}>
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
    </div>
  );
};

export default Session;
