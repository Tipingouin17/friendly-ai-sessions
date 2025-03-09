
import React from "react";
import { SessionContextProps } from "@/types/session";
import { SessionProviderCore } from "./SessionProviderCore";

interface RefactoredSessionProviderProps {
  children: (props: SessionContextProps) => React.ReactElement;
  handleSessionFull?: () => void;
  onError?: (error: string) => void;
}

export const RefactoredSessionProvider = ({ 
  children, 
  handleSessionFull, 
  onError 
}: RefactoredSessionProviderProps) => {
  return (
    <SessionProviderCore
      handleSessionFull={handleSessionFull}
      onError={onError}
    >
      {children}
    </SessionProviderCore>
  );
};
