
import React from 'react';
import { AlertCircle } from "lucide-react";
import SessionFullAlert from "./SessionFullAlert";

interface JoinSessionErrorStateProps {
  error?: string;
  invalidRequest: boolean;
  onRetry: () => void;
}

const JoinSessionErrorState: React.FC<JoinSessionErrorStateProps> = ({
  error,
  invalidRequest,
}) => {
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
      </div>
    </div>
  );
};

export default JoinSessionErrorState;
