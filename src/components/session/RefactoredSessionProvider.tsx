
import React, { useEffect } from "react";
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
  // Move sessionStorage access to an effect to prevent render-time DOM manipulation
  useEffect(() => {
    if (forceAdmin) {
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [forceAdmin]);
  
  return (
    <SessionProviderCore
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={forceAdmin}
      childrenFn={children}
    >
      {null}
    </SessionProviderCore>
  );
};
