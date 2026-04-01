
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadingStateActionsProps {
  isVeryLongWait: boolean;
  error?: string | null;
  retryCount?: number;
  onRefresh: () => void;
  onGoHome: () => void;
}

const LoadingStateActions: React.FC<LoadingStateActionsProps> = ({
  isVeryLongWait,
  error,
  retryCount = 0,
  onRefresh,
  onGoHome
}) => {
  if (!isVeryLongWait && !error) {
    return null;
  }

  return (
    <div className="mt-4">
      <Button 
        onClick={onRefresh}
        className="bg-indigo-600 hover:bg-indigo-700 text-white"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Retry Connection
      </Button>
      
      {retryCount > 1 && (
        <div className="mt-2">
          <Button 
            onClick={onGoHome}
            variant="outline"
            className="text-sm"
          >
            Return to Home
          </Button>
        </div>
      )}
    </div>
  );
};

export default LoadingStateActions;
