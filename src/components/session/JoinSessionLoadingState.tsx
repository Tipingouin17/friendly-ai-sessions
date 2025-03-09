
import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RefreshCw, WifiOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
  error?: string | null;
  retryCount?: number;
  loadingTimeElapsed?: number;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({ 
  onRetry,
  error,
  retryCount = 0,
  loadingTimeElapsed = 0
}) => {
  const [isLongWait, setIsLongWait] = useState(false);
  const [isVeryLongWait, setIsVeryLongWait] = useState(false);
  const [errorDescription, setErrorDescription] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(loadingTimeElapsed);
  const startTime = useRef(Date.now());
  const mountedRef = useRef(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Set up cleanup on unmount
  useEffect(() => {
    console.log("JoinSessionLoadingState mounted", { error, retryCount });
    mountedRef.current = true;
    
    // Start timer to update elapsed time
    timerRef.current = setInterval(() => {
      if (mountedRef.current) {
        const newElapsed = (Date.now() - startTime.current) / 1000;
        setElapsed(newElapsed);
        
        // Automatically update wait states based on elapsed time
        if (newElapsed > 4 && !isLongWait) {
          setIsLongWait(true);
        }
        if (newElapsed > 10 && !isVeryLongWait) {
          setIsVeryLongWait(true);
        }
      }
    }, 1000);
    
    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Process error messages to provide more helpful descriptions
  useEffect(() => {
    if (!error) {
      setErrorDescription(null);
      return;
    }
    
    // Handle different types of errors with more user-friendly messages
    if (error.includes("Permission denied") || error.includes("nodeType")) {
      setErrorDescription("There was a problem with browser permissions. This might be resolved by reloading the page.");
    } else if (error.includes("network") || error.includes("connection") || error.includes("timeout")) {
      setErrorDescription("There seems to be a network connectivity issue. Please check your internet connection.");
    } else if (error.includes("JSON") || error.includes("parse") || error.includes("no rows")) {
      setErrorDescription("The session data couldn't be loaded properly. Please try again.");
    } else {
      setErrorDescription(error);
    }
    
    // Force long wait states when there's an error
    setIsLongWait(true);
    setIsVeryLongWait(true);
  }, [error]);
  
  // If we already have a loading time elapsed or error, show appropriate state immediately
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (loadingTimeElapsed > 3) {
      setIsLongWait(true);
    }
    if (loadingTimeElapsed > 10 || retryCount > 0 || error) {
      setIsLongWait(true);
      setIsVeryLongWait(true);
    }
  }, [loadingTimeElapsed, retryCount, error]);

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const getStatusMessage = () => {
    if (error) {
      return "Unable to connect to the session";
    }
    
    if (isVeryLongWait) {
      if (retryCount > 1) {
        return "Still having trouble connecting...";
      }
      return "Unable to connect to the session";
    }
    
    if (isLongWait) {
      return "Taking longer than expected";
    }
    
    return "Loading session information...";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {!isVeryLongWait && !error ? (
          <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        ) : (
          error ? <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" /> : 
                 <WifiOff className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        )}
        
        <p className="text-gray-600 mb-2 text-lg font-medium">
          {getStatusMessage()}
        </p>
        
        {elapsed > 2 && (
          <div className="flex items-center justify-center text-sm text-gray-500 mb-3">
            <Clock className="w-4 h-4 mr-1" />
            <span>Elapsed: {Math.floor(elapsed)} seconds</span>
          </div>
        )}
        
        {(isLongWait || error) && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-left text-yellow-700">
              <p className="font-medium mb-1">
                {error ? "Connection error" : "Taking longer than expected"}
              </p>
              <p>
                {errorDescription
                  ? errorDescription
                  : isVeryLongWait 
                    ? "The session might be unavailable or there could be connection issues."
                    : "Connecting to the session. Please wait a moment..."}
              </p>
              {retryCount > 0 && !error && (
                <p className="mt-2 text-xs">
                  Retry attempt: {retryCount} {retryCount > 1 ? "(If issues persist, please check your network connection)" : ""}
                </p>
              )}
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
