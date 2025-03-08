
import React, { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({ 
  onRetry 
}) => {
  const [isLongWait, setIsLongWait] = useState(false);
  const [isVeryLongWait, setIsVeryLongWait] = useState(false);

  useEffect(() => {
    // Set a timeout to show an extended message if loading takes too long
    const longWaitTimeout = setTimeout(() => {
      setIsLongWait(true);
    }, 5000); // 5 seconds

    // Set a timeout for very long waits
    const veryLongWaitTimeout = setTimeout(() => {
      setIsVeryLongWait(true);
    }, 15000); // 15 seconds

    return () => {
      clearTimeout(longWaitTimeout);
      clearTimeout(veryLongWaitTimeout);
    };
  }, []);

  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {!isVeryLongWait ? (
          <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        ) : (
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
        )}
        
        <p className="text-gray-600 mb-2">
          {isVeryLongWait 
            ? "Unable to connect to the session" 
            : "Loading session information..."}
        </p>
        
        {isLongWait && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-left text-yellow-700">
              <p className="font-medium mb-1">Taking longer than expected</p>
              <p>
                The session might be unavailable or there could be connection issues. 
                {isVeryLongWait 
                  ? " Please try refreshing the page or check the session link."
                  : " Please wait a moment..."}
              </p>
            </div>
          </div>
        )}

        {isVeryLongWait && (
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
