/**
 * Session Error Boundary
 *
 * Outer guard that wraps the session provider stack.
 * All participant-facing loading / error UI is routed through
 * ParticipantLoadingShell so the participant always sees the same branded
 * card — never a different design.
 *
 * Admin paths bypass this component entirely.
 */

import React, { useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import ParticipantLoadingShell from "./ParticipantLoadingShell";

export interface SessionErrorBoundaryProps {
  children: React.ReactNode;
  error?: string | null;
  noSessionFound?: boolean;
  connectionAttempts?: number;
  retryConnection?: () => void;
  lastAttemptTime?: number;
  isLoading?: boolean;
  hasInitializedProvider?: boolean;
  isAdmin?: boolean;
  sessionMountedRef?: React.RefObject<boolean>;
}

const SessionErrorBoundary: React.FC<SessionErrorBoundaryProps> = ({
  children,
  error = null,
  noSessionFound = false,
  connectionAttempts = 0,
  retryConnection = () => { /* no-op */ },
  lastAttemptTime = 0,
  isLoading = false,
  hasInitializedProvider = false,
  isAdmin: propIsAdmin = false,
  sessionMountedRef,
}) => {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [pathInfo, setPathInfo] = useState({
    isOnAdminPath: false,
    isParticipantPath: false,
    hasSessionId: false,
    hasAdminQueryParam: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsClient(true);
    const isOnAdminPath = window.location.pathname.includes("/admin");
    const isParticipantPath =
      window.location.pathname.includes("/session") && !isOnAdminPath;
    const urlParams = new URLSearchParams(window.location.search);
    const hasSessionId = urlParams.has("id") && !!urlParams.get("id");
    const hasAdminQueryParam = window.location.search.includes("admin=true");
    setPathInfo({
      isOnAdminPath,
      isParticipantPath,
      hasSessionId,
      hasAdminQueryParam,
    });
  }, []);

  // Admin route: always bypass errors and render children
  if (pathInfo.isOnAdminPath) {
    return <>{children}</>;
  }

  const storedIsAdmin = isClient
    ? sessionStorage.getItem("isAdminSession") === "true"
    : false;
  const effectiveIsAdmin =
    propIsAdmin ||
    storedIsAdmin ||
    pathInfo.isOnAdminPath ||
    pathInfo.hasAdminQueryParam;

  if (effectiveIsAdmin) {
    return <>{children}</>;
  }

  // ── Participant path ───────────────────────────────────────────────────────

  // During early connection attempts: render children (provider) so it can
  // fetch and connect. If the provider hasn't initialised yet, overlay the
  // unified loading shell so the page is never blank.
  if (connectionAttempts < 2) {
    if (hasInitializedProvider) {
      return <>{children}</>;
    }
    // Provider still loading: mount it hidden so hooks run, show shell on top.
    return (
      <div style={{ position: "relative", flex: 1 }}>
        <div
          style={{
            visibility: "hidden",
            position: "absolute",
            inset: 0,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
        <ParticipantLoadingShell phase="connecting" onRetry={retryConnection} />
      </div>
    );
  }

  // An ended-session message is NOT a real error — participant stays on page.
  const isEndedSessionMessage =
    error?.includes("has ended") || error?.includes("no longer available");
  const hasError = (error && !isEndedSessionMessage) || noSessionFound;

  // connectionAttempts is incremented every 5 s when WS is disconnected.
  // Railway closes idle WS connections after ~60 s (~12 cycles before stable).
  // Use >= 8 to avoid false positives during normal WS reconnection cycles.
  const hasLastAttemptTimestamp = typeof lastAttemptTime === 'number' && lastAttemptTime > 0;
  const waitedTooLong =
    connectionAttempts >= 8 ||
    (isLoading &&
      !hasInitializedProvider &&
      hasLastAttemptTimestamp &&
      Date.now() - lastAttemptTime > 30000);

  if (hasError || waitedTooLong) {
    // If a session ID is present and we haven't exhausted retries, let the
    // provider keep trying (render children).
    if (pathInfo.hasSessionId && connectionAttempts < 8) {
      return <>{children}</>;
    }

    const isSessionFullError =
      error?.includes("session is full") ||
      error?.includes("maximum capacity") ||
      error?.includes("full") ||
      error?.includes("cannot accept more");

    const errorMessage =
      error ||
      (waitedTooLong
        ? "Having trouble connecting to the session. Please try again."
        : "This session could not be found or has ended. Please check the link and try again.");

    const handleRetry = () => {
      retryConnection();
      if (sessionMountedRef?.current) {
        toast({
          title: "Reconnecting…",
          description: "Attempting to reconnect to the session.",
        });
      }
    };

    return (
      <ParticipantLoadingShell
        phase={isSessionFullError ? "error" : "error"}
        errorMessage={errorMessage}
        onRetry={handleRetry}
        retryCount={connectionAttempts}
      />
    );
  }

  return <>{children}</>;
};

export default SessionErrorBoundary;
