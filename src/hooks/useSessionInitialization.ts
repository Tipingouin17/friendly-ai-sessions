
import { useState, useEffect } from "react";
import { SessionContextProps } from "@/types/session";

interface UseSessionInitializationProps {
  props: SessionContextProps;
  setSessionStarted: (started: boolean) => void;
}

export function useSessionInitialization({ 
  props, 
  setSessionStarted 
}: UseSessionInitializationProps) {
  const [initializing, setInitializing] = useState(true);
  
  // Check if the session is already started in the database
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session is already started in the database");
      setSessionStarted(true);
    }
    
    const timer = setTimeout(() => {
      setInitializing(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [props.isSessionStartedInDB, setSessionStarted]);

  return { initializing };
}
