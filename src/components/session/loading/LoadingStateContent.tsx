
import React from 'react';
import { AlertCircle, WifiOff, Clock } from 'lucide-react';

interface LoadingStateContentProps {
  isVeryLongWait: boolean;
  error?: string | null;
  elapsed: number;
  retryCount?: number;
  errorDescription?: string | null;
}

const LoadingStateContent: React.FC<LoadingStateContentProps> = ({
  isVeryLongWait,
  error,
  elapsed,
  retryCount = 0,
  errorDescription
}) => {
  const getStatusMessage = () => {
    if (error) {
      return "Unable to connect to the session";
    }
    
    if (isVeryLongWait) {
      if (retryCount > 1) {
        return "Still having trouble connecting...";
      }
      return "Connection taking longer than expected";
    }
    
    if (elapsed > 2) {
      return "Establishing connection...";
    }
    
    return "Loading session...";
  };

  return (
    <div className="text-center max-w-md">
      {!isVeryLongWait && !error ? (
        <div className="w-10 h-10 border-t-2 border-amber-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
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
      
      {(elapsed > 2 || error) && (
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
                Retry attempt: {retryCount} {retryCount > 1 ? "(If issues persist, please try refreshing the page)" : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadingStateContent;
