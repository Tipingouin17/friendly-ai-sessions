
import { useState, useEffect } from "react";
import { SessionContextProps } from "@/types/session";

interface UseSessionInitializationProps {
  props: SessionContextProps;
  setSessionStarted: (started: boolean) => void;
  isAdmin?: boolean;
}

export function useSessionInitialization({ 
  props, 
  setSessionStarted,
  isAdmin = false
}: UseSessionInitializationProps) {
  const [initializing, setInitializing] = useState(true);
  
  // Check if the session is already started in the database
  useEffect(() => {
    if (props.isSessionStartedInDB) {
      console.log("Session is already started in the database");
      setSessionStarted(true);
    }
    
    // Shorter initialization time for admin users
    const initializationTime = isAdmin ? 300 : 500;
    
    const timer = setTimeout(() => {
      setInitializing(false);
      console.log(`Initialization complete after ${initializationTime}ms, isAdmin:`, isAdmin);
    }, initializationTime);
    
    return () => clearTimeout(timer);
  }, [props.isSessionStartedInDB, setSessionStarted, isAdmin]);

  return { initializing };
}
