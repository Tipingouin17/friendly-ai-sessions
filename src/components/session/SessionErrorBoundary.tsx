
import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

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
  isAdmin = false
}) => {
  const { toast } = useToast();
  const { isAdmin: adminStatus } = useSessionAdminStatus();
  const effectiveIsAdmin = isAdmin || adminStatus;
  
  // Log error information for debugging
  useEffect(() => {
    if (error || noSessionFound) {
      console.log("SessionErrorBoundary showing error:", { 
        error, 
        noSessionFound, 
        connectionAttempts,
        isSessionFull: error?.includes("full") || error?.includes("maximum capacity"),
        isAdmin: effectiveIsAdmin
      });
    }
  }, [error, noSessionFound, connectionAttempts, effectiveIsAdmin]);

  // For admin users, bypass session full errors
  if (effectiveIsAdmin && error && (error.includes("full") || error.includes("maximum capacity"))) {
    console.log("Admin user detected - bypassing session full error");
    // Render children for admin users even when session is full
    return <>{children}</>;
  }

  if (error || noSessionFound) {
    const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity");
    const isSessionNotFoundError = noSessionFound || error?.includes("not found") || error?.includes("no longer available");
    
    const errorTitle = isSessionFullError ? "Session Full" : 
                       isSessionNotFoundError ? "Session Not Found" : 
                       "Session Error";
                       
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{errorTitle}</h2>
          <p className="text-gray-600 mb-6">
            {error || "This session could not be found or has ended. Please check the link and try again."}
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
              onClick={() => window.location.href = "/"}
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
