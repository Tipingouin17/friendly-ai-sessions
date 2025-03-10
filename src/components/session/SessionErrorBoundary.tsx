
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
  isAdmin: propIsAdmin = false
}) => {
  const { toast } = useToast();
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  const storedIsAdmin = sessionStorage.getItem('isAdminSession') === 'true';
  const effectiveIsAdmin = propIsAdmin || contextIsAdmin || storedIsAdmin;
  
  // Log error information for debugging
  useEffect(() => {
    if (error || noSessionFound) {
      console.log("SessionErrorBoundary showing error:", { 
        error, 
        noSessionFound, 
        connectionAttempts,
        isSessionFull: error?.includes("full") || error?.includes("maximum capacity"),
        isAdmin: effectiveIsAdmin,
        adminFromProps: propIsAdmin,
        adminFromContext: contextIsAdmin,
        adminFromStorage: storedIsAdmin
      });
    }
    
    // Enforce admin status if needed
    if (effectiveIsAdmin) {
      console.log("🔑 Admin detected in SessionErrorBoundary - ensuring admin status is set");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [error, noSessionFound, connectionAttempts, effectiveIsAdmin, propIsAdmin, contextIsAdmin, storedIsAdmin]);

  // For admin users, bypass session full errors completely
  const isSessionFullError = error?.includes("full") || error?.includes("maximum capacity");
  
  if (effectiveIsAdmin && isSessionFullError) {
    console.log("🔑 Admin user detected in error boundary - bypassing session full error");
    
    // Auto-retry once for admins with session full errors
    useEffect(() => {
      if (effectiveIsAdmin && isSessionFullError) {
        const timer = setTimeout(() => {
          console.log("🔑 Auto-retrying for admin user with session full error");
          retryConnection();
          toast({
            title: "Admin Override",
            description: "Session is full but you're connecting as an admin user."
          });
        }, 800);
        
        return () => clearTimeout(timer);
      }
    }, [effectiveIsAdmin, isSessionFullError]);
    
    // Render children for admin users even when session is full
    return <>{children}</>;
  }

  if (error || noSessionFound) {
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
