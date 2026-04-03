/**
 * Session Provider Core Error
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import { SessionContextProps } from "@/types/session";
import { SessionProviderErrorFallback } from "./SessionProviderErrorFallback";

interface SessionProviderCoreErrorProps {
  children: React.ReactNode;
  childrenFn?: (props: SessionContextProps) => React.ReactElement;
  providerError: string | null;
  effectiveAdmin: boolean;
  refetch: () => void;
  sessionContextValue?: SessionContextProps;
}

export const SessionProviderCoreError = ({
  children,
  childrenFn,
  providerError,
  effectiveAdmin,
  refetch,
  sessionContextValue
}: SessionProviderCoreErrorProps) => {
  // If there's no error and we have the context value, render with context
  if (!providerError && sessionContextValue && childrenFn) {
    return childrenFn(sessionContextValue);
  }
  
  // If there's an error, show the error fallback
  if (providerError) {
    return (
      <SessionProviderErrorFallback
        errorMessage={providerError}
        isAdmin={effectiveAdmin}
        onRetry={refetch}
      >
        {children}
      </SessionProviderErrorFallback>
    );
  }
  
  // Fallback for when we don't have a context value but also don't have an error
  return <>{children}</>;
};
