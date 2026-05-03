/**
 * Session Error Boundary
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import SessionConnecting from "./SessionConnecting";

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
  sessionMountedRef
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);
  const [pathInfo, setPathInfo] = useState({
    isOnAdminPath: false,
    isParticipantPath: false,
    hasSessionId: false,
    hasAdminQueryParam: false
  });
  
  // Initialize client-only state after hydration
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    setIsClient(true);
    
    const isOnAdminPath = window.location.pathname.includes('/admin');
    const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminPath;
    const urlParams = new URLSearchParams(window.location.search);
    const hasSessionId = urlParams.has('id') && urlParams.get('id');
    const hasAdminQueryParam = window.location.search.includes('admin=true');
    
    setPathInfo({
      isOnAdminPath,
      isParticipantPath,
      hasSessionId: !!hasSessionId,
      hasAdminQueryParam
    });
  }, []);
  
  // Debug logging - only on client
  useEffect(() => {
    if (!isClient) return;
    
  }, [error, noSessionFound, connectionAttempts, lastAttemptTime, isLoading, 
      hasInitializedProvider, propIsAdmin, pathInfo, isClient]);
  
  // If on dedicated admin route, always bypass errors
  if (pathInfo.isOnAdminPath) {
    return <>{children}</>;
  }
  
  // Enhanced admin detection - check all possible sources (only on client)
  const storedIsAdmin = isClient ? sessionStorage.getItem('isAdminSession') === 'true' : false;
  
  // Combined admin detection from all possible sources
  const effectiveIsAdmin = propIsAdmin || 
                         storedIsAdmin || 
                         pathInfo.isOnAdminPath || 
                         pathInfo.hasAdminQueryParam;
  
  // During initial connection attempts (< 2), always render children (the provider)
  // so it can fetch data and connect. If the provider hasn't initialised yet,
  // also show SessionConnecting as a visible overlay so the page is never blank.
  if (effectiveIsAdmin) {
    return <>{children}</>;
  }
  if (connectionAttempts < 2) {
    if (hasInitializedProvider) {
      // Provider is ready — show the session UI normally.
      return <>{children}</>;
    }
    // Provider is still loading: render it with visibility:hidden so it mounts,
    // runs hooks (React Query fetch + WebSocket), and calls onInitialized().
    // Show SessionConnecting as an absolute overlay on top.
    return (
      <div style={{ position: 'relative', flex: 1 }}>
        <div style={{ visibility: 'hidden', position: 'absolute', inset: 0, overflow: 'hidden' }}>
          {children}
        </div>
        <SessionConnecting
          timeoutSeconds={60}
          onRetry={retryConnection}
          isColdStart={true}
        />
      </div>
    );
  }

  // IMPROVED ERROR DETECTION: Check for common error conditions that indicate session problems
  // An ended-session message is NOT a real error — the participant should stay
  // on the page and see the transcript with the ended banner.
  const isEndedSessionMessage = error?.includes("has ended") || error?.includes("no longer available");

  const hasError = (error && !isEndedSessionMessage) || noSessionFound;
  // connectionAttempts is incremented every 5s when WS is disconnected (useConnectionRecovery).
  // Railway closes idle WS connections after ~60s, causing ~12 reconnection cycles before the
  // WS stabilises. Use >= 8 to avoid false positives during normal WS reconnection cycles.
  // The 30s timeout guard covers the case where the provider never initialises at all.
  const waitedTooLong = connectionAttempts >= 8 || (isLoading && !hasInitializedProvider && Date.now() - lastAttemptTime > 30000);
  
  if (hasError || waitedTooLong) {
    // If there's an active session (based on URL parameter), bypass this error for participants too
    if (pathInfo.hasSessionId && connectionAttempts < 8) {
      return <>{children}</>;
    }
    
    const isSessionNotFoundError = noSessionFound || error?.includes("not found") || error?.includes("no longer available");
    const isSessionFullError = error?.includes("session is full") || error?.includes("maximum capacity") || 
                              error?.includes("full") || error?.includes("cannot accept more");
    
    const errorTitle = isSessionFullError ? "Session Full" : 
                      isSessionNotFoundError ? "Session Not Found" : 
                      waitedTooLong ? "Connection Problem" : "Session Error";
    
    const errorMessage = error || 
                         (waitedTooLong ? "Having trouble connecting to the session. Please try again." : 
                         "This session could not be found or has ended. Please check the link and try again.");
                      
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{errorTitle}</h2>
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={() => {
                retryConnection();
                
                // Check if component is still mounted before showing toast
                if (sessionMountedRef?.current) {
                  toast({
                    title: "Reconnecting...",
                    description: "Attempting to reconnect to the session.",
                  });
                }
              }}
              className="w-full bg-indigo-400 hover:bg-indigo-500 text-black"
              disabled={connectionAttempts > 5 && Date.now() - lastAttemptTime < 10000}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {connectionAttempts > 3 ? `Retry (Attempt ${connectionAttempts})` : "Retry Connection"}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Return Home
            </Button>
          </div>
          
          {connectionAttempts > 5 && (
            <p className="mt-4 text-sm text-gray-500">
              Multiple connection attempts failed. There might be an issue with the session.
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SessionErrorBoundary;
