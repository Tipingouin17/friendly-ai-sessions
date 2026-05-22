/**
 * Session Provider Error Fallback
 *
 * Handles provider-level errors (network, connection lost, cold-start).
 * All participant-facing UI is routed through ParticipantLoadingShell so the
 * participant always sees the same branded card — never a different design.
 *
 * Admin paths bypass this component entirely (see SessionErrorBoundary).
 */

import React, { useEffect, useState, useCallback } from "react";
import { isNetworkError, isAbortError } from "@/utils/networkUtils";
import ParticipantLoadingShell from "./ParticipantLoadingShell";
import api from "@/lib/api";

interface SessionProviderErrorFallbackProps {
  errorMessage: string;
  children: React.ReactNode;
  isAdmin?: boolean;
  onRetry?: () => void;
  retryCount?: number;
}

export const SessionProviderErrorFallback = ({
  errorMessage,
  children,
  isAdmin = false,
  onRetry,
  retryCount = 0,
}: SessionProviderErrorFallbackProps) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [autoRetryCount, setAutoRetryCount] = useState(0);
  const [lastRetryTime, setLastRetryTime] = useState(0);
  const [isCircuitBreakerOpen, setIsCircuitBreakerOpen] = useState(false);

  const isSessionFullError =
    errorMessage.includes("session is full") ||
    errorMessage.includes("maximum capacity");
  const isNetworkErr = isNetworkError({ message: errorMessage });
  const isAbortErr = isAbortError({ message: errorMessage });
  const isConnectionLostError = errorMessage.includes("Connection to server lost");

  // Circuit breaker: prevent infinite retry loops
  useEffect(() => {
    if (autoRetryCount >= 3) {
      setIsCircuitBreakerOpen(true);
      const resetTimeout = setTimeout(() => {
        setIsCircuitBreakerOpen(false);
        setAutoRetryCount(0);
      }, 30000);
      return () => clearTimeout(resetTimeout);
    }
  }, [autoRetryCount]);

  // Auto-retry for network errors (with circuit breaker)
  useEffect(() => {
    if (
      isNetworkErr &&
      !isAbortErr &&
      !isCircuitBreakerOpen &&
      onRetry &&
      autoRetryCount < 3
    ) {
      const timeSinceLastRetry = Date.now() - lastRetryTime;
      if (timeSinceLastRetry < 5000) return;
      const retryDelay = Math.min(2000 * Math.pow(2, autoRetryCount), 10000);
      const timeoutId = setTimeout(() => {
        setAutoRetryCount((prev) => prev + 1);
        setLastRetryTime(Date.now());
        onRetry();
      }, retryDelay);
      return () => clearTimeout(timeoutId);
    }
  }, [isNetworkErr, isAbortErr, onRetry, autoRetryCount, isCircuitBreakerOpen, lastRetryTime]);

  // Silent retry for abort errors
  useEffect(() => {
    if (isAbortErr && onRetry && autoRetryCount === 0) {
      const timeoutId = setTimeout(() => {
        setAutoRetryCount(1);
        onRetry();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [isAbortErr, onRetry, autoRetryCount]);

  // Auto-retry for connection-lost errors
  useEffect(() => {
    if (isConnectionLostError && !isAdmin && autoRetryCount < 3 && onRetry) {
      const timeSinceLastRetry = Date.now() - lastRetryTime;
      const retryDelay = Math.min(3000 * Math.pow(2, autoRetryCount), 15000);
      if (timeSinceLastRetry > retryDelay) {
        setLastRetryTime(Date.now());
        setAutoRetryCount((prev) => prev + 1);
        onRetry();
      }
    }
  }, [isConnectionLostError, isAdmin, autoRetryCount, onRetry, lastRetryTime]);

  // Admin: persist session flag and auto-retry on session-full
  useEffect(() => {
    if (isAdmin) {
      sessionStorage.setItem("isAdminSession", "true");
      if (onRetry && isSessionFullError && autoRetryCount === 0) {
        setTimeout(() => {
          setAutoRetryCount(1);
          onRetry();
        }, 1000);
      }
    }
  }, [isAdmin, isSessionFullError, onRetry, autoRetryCount]);

  const handleManualRetry = useCallback(async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      setLastRetryTime(Date.now());
      if (isCircuitBreakerOpen) {
        setIsCircuitBreakerOpen(false);
        setAutoRetryCount(0);
      }
      api.forceReconnect();
      try {
        await onRetry();
      } finally {
        setTimeout(() => setIsRetrying(false), 2000);
      }
    }
  }, [onRetry, isRetrying, isCircuitBreakerOpen]);

  // ─── All hooks above — early returns below ────────────────────────────────

  // Abort errors: render children silently (will auto-retry)
  if (isAbortErr) {
    return <>{children}</>;
  }

  // Admin: bypass all error UI — let the session render normally
  if (isAdmin) {
    return <>{children}</>;
  }

  // ── Participant-facing UI — always ParticipantLoadingShell ─────────────────

  // Connection lost / cold-start / network error with active auto-retry:
  // show "connecting" phase while we keep retrying in the background.
  if (
    (isConnectionLostError || isNetworkErr) &&
    autoRetryCount < 3 &&
    !isCircuitBreakerOpen
  ) {
    return (
      <ParticipantLoadingShell
        phase="connecting"
        onRetry={autoRetryCount >= 2 ? handleManualRetry : undefined}
      />
    );
  }

  // Persistent failure (circuit breaker open or too many retries): error phase
  const persistentErrorMessage = isCircuitBreakerOpen
    ? "We could not reconnect after several attempts. Please wait a moment, then retry. If it still does not work, ask the host to share the session link again."
    : isConnectionLostError
    ? "The connection to the session was interrupted. Please retry; you will rejoin the same session when the connection is restored."
    : errorMessage;

  return (
    <ParticipantLoadingShell
      phase="error"
      errorMessage={persistentErrorMessage}
      onRetry={handleManualRetry}
      retryCount={retryCount}
    />
  );
};
