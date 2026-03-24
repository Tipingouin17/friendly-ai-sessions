
import React from 'react';
import { AlertCircle, Clock } from "lucide-react";
import SessionFullAlert from "./SessionFullAlert";

interface JoinSessionErrorStateProps {
  error?: string;
  invalidRequest: boolean;
  onRetry: () => void;
}

const JoinSessionErrorState: React.FC<JoinSessionErrorStateProps> = ({
  error,
  invalidRequest,
  onRetry,
}) => {
  // Check if the error indicates a completed/ended session
  const isSessionEnded = error && (
    error.toLowerCase().includes('session has ended') ||
    error.toLowerCase().includes('no longer available') ||
    error.toLowerCase().includes('session is closed') ||
    error.toLowerCase().includes('completed')
  );

  if (isSessionEnded) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md text-center">
          <div className="mb-4 flex justify-center">
            <Clock className="h-12 w-12 text-amber-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Session Has Ended</h2>
          <p className="text-gray-600 mb-6">
            This facilitated session has been completed. Thank you for your participation!
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-amber-400 hover:bg-amber-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <SessionFullAlert 
          type="not-found" 
          message={error ? `Error: ${error}` : invalidRequest ? 
            "Invalid session link. Please make sure you have the correct URL." : 
            "The session you're trying to join doesn't exist or has been closed."} 
        />
        <div className="mt-4 space-y-2">
          <button
            onClick={onRetry}
            className="w-full bg-amber-400 hover:bg-amber-500 text-black font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Retry Connection
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default JoinSessionErrorState;
