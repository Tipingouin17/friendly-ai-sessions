
import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SessionErrorBoundaryProps {
  children: React.ReactNode;
  error?: string | null;
  noSessionFound?: boolean;
  connectionAttempts?: number;
  retryConnection?: () => void;
  lastAttemptTime?: number;
  isLoading?: boolean;
  hasInitializedProvider?: boolean;
}

const SessionErrorBoundary: React.FC<SessionErrorBoundaryProps> = ({
  children,
  error = null,
  noSessionFound = false,
  connectionAttempts = 0,
  retryConnection = () => {},
  lastAttemptTime = 0,
  isLoading = false,
  hasInitializedProvider = false
}) => {
  if (error || noSessionFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {noSessionFound ? "Session Not Found" : "Session Error"}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || "This session could not be found or has ended. Please check the link and try again."}
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={retryConnection}
              className="w-full"
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
