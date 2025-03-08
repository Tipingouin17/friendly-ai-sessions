
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
  error?: string | null;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({ 
  onRetry,
  error
}) => {
  const [isLongWait, setIsLongWait] = useState(false);
  const [isVeryLongWait, setIsVeryLongWait] = useState(false);

  useEffect(() => {
    // Reset wait states if there's an error
    if (error) {
      setIsLongWait(true);
      setIsVeryLongWait(true);
      return;
    }
    
    // Clear previous timeouts when component rerenders
    const timeouts: NodeJS.Timeout[] = [];
    
    // Set a timeout to show an extended message if loading takes too long
    const longWaitTimeout = setTimeout(() => {
      setIsLongWait(true);
    }, 3000); // 3 seconds for better UX
    
    timeouts.push(longWaitTimeout);

    // Set a timeout for very long waits
    const veryLongWaitTimeout = setTimeout(() => {
      setIsVeryLongWait(true);
    }, 10000); // 10 seconds
    
    timeouts.push(veryLongWaitTimeout);

    return () => {
      // Clean up all timeouts on unmount
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [error]);

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    
    // Handle specific error messages nicely
    if (error.includes("JSON object requested") || error.includes("no rows")) {
      return "The session data couldn't be updated. Please try again.";
    }
    
    return error;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {!isVeryLongWait && !error ? (
          <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        ) : (
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        )}
        
        <p className="text-gray-600 mb-2">
          {error 
            ? "Unable to connect to the session" 
            : isVeryLongWait 
              ? "Unable to connect to the session" 
              : "Loading session information..."}
        </p>
        
        {(isLongWait || error) && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-left text-yellow-700">
              <p className="font-medium mb-1">
                {error ? "Connection error" : "Taking longer than expected"}
              </p>
              <p>
                {error
                  ? getErrorMessage()
                  : isVeryLongWait 
                    ? "The session might be unavailable or there could be connection issues."
                    : "Connecting to the session. Please wait a moment..."}
              </p>
            </div>
          </div>
        )}

        {(isVeryLongWait || error) && (
          <div className="mt-4">
            <Button 
              onClick={handleRefresh}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinSessionLoadingState;
