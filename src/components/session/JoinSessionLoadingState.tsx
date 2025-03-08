
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

const JoinSessionLoadingState: React.FC = () => {
  const [isLongWait, setIsLongWait] = useState(false);

  useEffect(() => {
    // Set a timeout to show an extended message if loading takes too long
    const timeout = setTimeout(() => {
      setIsLongWait(true);
    }, 5000); // 5 seconds

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 mb-2">Loading session information...</p>
        
        {isLongWait && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-left text-yellow-700">
              <p className="font-medium mb-1">Taking longer than expected</p>
              <p>
                The session might be unavailable or there could be connection issues. 
                If this continues, please check the session link or try refreshing the page.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinSessionLoadingState;
