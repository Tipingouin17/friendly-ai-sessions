/**
 * Session Connecting
 *
 * Shown while the backend is cold-starting or the WebSocket is being established.
 * Replaces the blank-page experience during Railway cold-starts (up to 60 s).
 * Auto-retries when the backend health check passes.
 */

import React, { useEffect, useRef, useState } from "react";
import { Wifi, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SessionConnectingProps {
  /** How many seconds to count down before showing the manual retry button. */
  timeoutSeconds?: number;
  onRetry?: () => void;
  /** If true, the backend health check is in progress (cold-start). */
  isColdStart?: boolean;
}

const HEALTH_CHECK_URL = `${import.meta.env.VITE_API_URL || ""}/health`;
const HEALTH_CHECK_INTERVAL_MS = 6000; // Poll every 6 seconds

const SessionConnecting: React.FC<SessionConnectingProps> = ({
  timeoutSeconds = 60,
  onRetry,
  isColdStart = false,
}) => {
  const [elapsed, setElapsed] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const hasAutoRetried = useRef(false);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= timeoutSeconds) {
          setShowRetry(true);
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeoutSeconds]);

  // Auto health-check polling: ping the backend every 6s and auto-retry when it responds
  useEffect(() => {
    if (!isColdStart || !onRetry) return;

    const checkHealth = async () => {
      try {
        const res = await fetch(HEALTH_CHECK_URL, {
          method: "GET",
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok && !hasAutoRetried.current) {
          hasAutoRetried.current = true;
          setServerReady(true);
          // Small delay to let the server fully stabilise before reconnecting
          setTimeout(() => {
            onRetry?.();
          }, 1000);
        }
      } catch {
        // Server not ready yet — keep polling
      }
    };

    // Start polling immediately, then every HEALTH_CHECK_INTERVAL_MS
    checkHealth();
    const healthInterval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(healthInterval);
  }, [isColdStart, onRetry]);

  const remaining = Math.max(0, timeoutSeconds - elapsed);
  const progress = Math.min(100, (elapsed / timeoutSeconds) * 100);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center space-y-6">
        {/* Animated icon */}
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div
            className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"
            style={{ animationDuration: "1.2s" }}
          />
          <Wifi className="absolute inset-0 m-auto w-7 h-7 text-indigo-400" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800">
            {serverReady
              ? "Server ready — reconnecting…"
              : isColdStart
              ? "Waking up the server…"
              : "Connecting to session…"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {serverReady
              ? "The server is back online. Resuming your session…"
              : isColdStart
              ? "The server is starting up. This can take up to a minute on the first load."
              : "Establishing a secure connection. Please wait."}
          </p>
        </div>

        {/* Progress bar */}
        {!showRetry && (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">
              {serverReady
                ? "Reconnecting…"
                : remaining > 0
                ? `Retrying for up to ${remaining}s…`
                : "Still trying…"}
            </p>
          </div>
        )}

        {/* Manual retry button — shown after timeout */}
        {showRetry && !serverReady && onRetry && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Connection is taking longer than expected.
            </p>
            <Button
              onClick={onRetry}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionConnecting;
