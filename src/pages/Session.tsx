/**
 * Session
 *
 * Page for the AIfacilitator application.
 */

import React from "react";
import { useSessionPageState } from "@/hooks/useSessionPageState";
import { useSessionPageEffects } from "@/hooks/useSessionPageEffects";
import SessionContent from "@/components/session/SessionContent";
import { useIsMobile } from "@/hooks/use-mobile";
import SessionMobileNav from "@/components/session/SessionMobileNav";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";

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
    isClient,
    isOnAdminPath
  } = useSessionPageState();

  // Check if we're on mobile (will be undefined during hydration)
  const isMobile = useIsMobile();

  // Set up session page effects — pass isAdmin and isOnAdminPath so the
  // critical timeout is correctly scoped per persona.
  const { sessionMountedRef } = useSessionPageEffects({
    isLoading,
    hasInitializedProvider,
    setIsLoading,
    retryConnection,
    isAdmin: stateRef.current.isAdmin ?? false,
    isOnAdminPath: isOnAdminPath ?? false
  });

  // Show mobile nav only when we know we're on mobile
  const showMobileNav = isClient && isMobile;

  const urlParams = new URLSearchParams(window.location.search);
  const hasSessionId = urlParams.has('id') && !!urlParams.get('id');
  const hasParticipantIdentity = urlParams.has('participantId') || urlParams.has('name') || urlParams.has('token');
  const isBareParticipantSessionRoute = window.location.pathname === '/session' && !hasSessionId && !hasParticipantIdentity;

  if (isBareParticipantSessionRoute) {
    return (
      <JoinSessionLoadingState
        error="This session link is missing required session information. Please use the invite link from your host or return home."
        onRetry={retryConnection}
        retryCount={stateRef.current.connectionAttempts}
      />
    );
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Mobile navigation container - always present for consistent DOM structure */}
      <div className={`${showMobileNav ? 'block' : 'hidden'}`}>
        <SessionMobileNav />
      </div>

      <div className={`flex-1 overflow-hidden ${showMobileNav ? 'pt-12 sm:pt-16' : ''}`}>
        <SessionContent
          isLoading={isLoading}
          hasInitializedProvider={hasInitializedProvider}
          sessionStarted={sessionStarted}
          error={stateRef.current.error}
          noSessionFound={stateRef.current.noSessionFound}
          connectionAttempts={stateRef.current.connectionAttempts}
          isAdmin={false}
          sessionMountedRef={sessionMountedRef}
          handleProviderInitialized={handleProviderInitialized}
          setIsLoading={setIsLoading}
          handleError={handleError}
          handleSessionFull={handleSessionFull}
          retryConnection={retryConnection}
          forceAdmin={false}
        />
      </div>
    </div>
  );
};

export default Session;
