
import React from "react";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import EmptyState from "@/components/session/EmptyState";

interface SessionErrorBoundaryProps {
  children: React.ReactNode;
  error: string | null;
  noSessionFound: boolean;
  retryConnection: () => void;
  connectionAttempts: number;
  isLoading: boolean;
  hasInitializedProvider: boolean;
  lastAttemptTime: number;
}

const SessionErrorBoundary: React.FC<SessionErrorBoundaryProps> = ({
  children,
  error,
  noSessionFound,
  retryConnection,
  connectionAttempts,
  isLoading,
  hasInitializedProvider,
  lastAttemptTime
}) => {
  // Show empty state if no session is found
  if (noSessionFound) {
    return <EmptyState />;
  }

  // Show error state if there's an error
  if (error) {
    console.log("Rendering error state:", error);
    return <JoinSessionLoadingState 
      error={error} 
      onRetry={retryConnection}
      retryCount={connectionAttempts} 
    />;
  }

  // Show loading state during initial load
  if (isLoading && !error && !hasInitializedProvider) {
    console.log("Rendering global loading state");
    const loadingTimeElapsed = lastAttemptTime > 0 ? (Date.now() - lastAttemptTime) / 1000 : 0;
    return <JoinSessionLoadingState 
      onRetry={retryConnection}
      retryCount={connectionAttempts}
      loadingTimeElapsed={loadingTimeElapsed} 
    />;
  }

  // No errors or loading, render children
  return <>{children}</>;
};

export default SessionErrorBoundary;
