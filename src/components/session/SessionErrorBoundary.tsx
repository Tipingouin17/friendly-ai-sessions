
import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { useNavigate } from "react-router-dom";

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
}

const SessionErrorBoundary: React.FC<SessionErrorBoundaryProps> = ({
  children,
  error = null,
  noSessionFound = false,
  connectionAttempts = 0,
  retryConnection = () => {},
  lastAttemptTime = 0,
  isLoading = false,
  hasInitializedProvider = false,
  isAdmin: propIsAdmin = false
}) => {
  const { toast } = useToast();
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  const navigate = useNavigate();
  
  // Debug logging
  useEffect(() => {
    console.log("SessionErrorBoundary state:", {
      error,
      noSessionFound,
      connectionAttempts,
      lastAttemptTime,
      isLoading,
      hasInitializedProvider,
      propIsAdmin,
      contextIsAdmin,
      storedIsAdmin: sessionStorage.getItem('isAdminSession') === 'true',
      isOnAdminPath: window.location.pathname.includes('/admin'),
      hasAdminQueryParam: window.location.search.includes('admin=true'),
      currentPath: window.location.pathname
    });
  }, [error, noSessionFound, connectionAttempts, lastAttemptTime, isLoading, 
      hasInitializedProvider, propIsAdmin, contextIsAdmin]);
  
  // Check if we're on the dedicated admin route
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const isParticipantPath = window.location.pathname.includes('/session') && !isOnAdminPath;
  
  // Enhanced admin detection - check all possible sources
  const storedIsAdmin = sessionStorage.getItem('isAdminSession') === 'true';
  const hasAdminQueryParam = window.location.search.includes('admin=true');
  
  // Combined admin detection from all possible sources
  const effectiveIsAdmin = propIsAdmin || 
                         contextIsAdmin || 
                         storedIsAdmin || 
                         isOnAdminPath || 
                         hasAdminQueryParam;
  
  // If on dedicated admin route, always bypass errors
  if (isOnAdminPath) {
    console.log("🔑 On dedicated admin route - always bypassing error boundary");
    return <>{children}</>;
  }
  
  // CRITICAL FIX: For participant paths, don't use admin status from session storage
  // This ensures participants see proper errors and don't get admin privileges
  const shouldBypassErrors = isParticipantPath ? 
    (propIsAdmin || contextIsAdmin || hasAdminQueryParam) : effectiveIsAdmin;
  
  // For admin users, bypass ALL errors completely
  if (shouldBypassErrors) {
    console.log("🔑 Admin user detected in error boundary - bypassing all errors");
    
    // Render children for admin users even when session has errors
    return <>{children}</>;
  }

  // IMPROVED ERROR DETECTION: Check for common error conditions that indicate session problems
  const hasError = error || noSessionFound;
  const waitedTooLong = connectionAttempts > 3 || (isLoading && !hasInitializedProvider && Date.now() - lastAttemptTime > 10000);
  
  if (hasError || waitedTooLong) {
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
                console.log("Retry connection clicked, reconnecting...");
                retryConnection();
                toast({
                  title: "Reconnecting...",
                  description: "Attempting to reconnect to the session.",
                });
              }}
              className="w-full bg-amber-400 hover:bg-amber-500 text-black"
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
