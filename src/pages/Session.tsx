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
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden">
      {/* The participant header is fixed. Keep its safe-area-aware height and this
          content offset in one explicit contract so mobile activity scroll never
          travels underneath it. */}
      <div className={`${showMobileNav ? 'block' : 'hidden'}`}>
        <SessionMobileNav />
      </div>

      <div className={`min-h-0 flex-1 overflow-hidden ${showMobileNav ? 'pt-[calc(3rem+env(safe-area-inset-top))] sm:pt-16' : ''}`}>
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
