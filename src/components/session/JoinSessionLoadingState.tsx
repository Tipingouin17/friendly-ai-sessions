
import React from 'react';
import { useLoadingStateTimer } from '@/hooks/useLoadingStateTimer';
import { useLoadingErrorHandling } from '@/hooks/useLoadingErrorHandling';
import { useLoadingStateActions } from '@/hooks/useLoadingStateActions';
import LoadingStateContent from './loading/LoadingStateContent';
import LoadingStateActions from './loading/LoadingStateActions';

interface JoinSessionLoadingStateProps {
  onRetry?: () => void;
  error?: string | null;
  retryCount?: number;
  loadingTimeElapsed?: number;
  customMessage?: string;
}

const JoinSessionLoadingState: React.FC<JoinSessionLoadingStateProps> = ({ 
  onRetry,
  error,
  retryCount = 0,
  loadingTimeElapsed = 0,
  customMessage
}) => {
  const { elapsed, isLongWait, isVeryLongWait, mountedRef } = useLoadingStateTimer({
    loadingTimeElapsed,
    retryCount,
    error,
    onRetry
  });

  const { errorDescription } = useLoadingErrorHandling(error, retryCount);

  const { handleRefresh, goToHome } = useLoadingStateActions({
    elapsed,
    onRetry,
    mountedRef
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-4">
      <LoadingStateContent
        isVeryLongWait={isVeryLongWait}
        error={error}
        elapsed={elapsed}
        retryCount={retryCount}
        errorDescription={errorDescription}
        customMessage={customMessage}
      />
      
      <LoadingStateActions
        isVeryLongWait={isVeryLongWait}
        error={error}
        retryCount={retryCount}
        onRefresh={handleRefresh}
        onGoHome={goToHome}
      />
    </div>
  );
};

export default JoinSessionLoadingState;
