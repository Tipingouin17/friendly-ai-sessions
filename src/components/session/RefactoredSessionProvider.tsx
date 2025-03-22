
import React from "react";
import { SessionContextProps } from "@/types/session";
import { SessionProviderCore } from "./SessionProviderCore";

interface RefactoredSessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
  forceAdmin?: boolean;
}

export const RefactoredSessionProvider = ({ 
  children, 
  handleSessionFull, 
  onError,
  forceAdmin 
}: RefactoredSessionProviderProps) => {
  // Set admin in session storage if forced - use direct DOM method to avoid state changes
  if (forceAdmin) {
    sessionStorage.setItem('isAdminSession', 'true');
  }
  
  return (
    <SessionProviderCore
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={forceAdmin}
    >
      {children}
    </SessionProviderCore>
  );
};
