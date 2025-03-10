
import React, { useEffect, useRef } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { SessionContextProps } from "@/types/session";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { useToast } from "@/components/ui/use-toast";

interface SessionProviderWrapperProps {
  onInitialized?: () => void;
  onLoading?: (isLoading: boolean) => void;
  onError?: (error: string) => void;
  handleSessionFull?: () => void;
  retryConnection?: () => void;
  connectionAttempts?: number;
  error?: string | null;
  sessionMountedRef?: React.RefObject<boolean>;
  isAdmin?: boolean;
  forceAdmin?: boolean;
  children?: (props: SessionContextProps) => React.ReactElement;
}

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized = () => {},
  onLoading = () => {},
  onError = () => {},
  handleSessionFull = () => {},
  retryConnection = () => {},
  connectionAttempts = 0,
  error = null,
  sessionMountedRef = { current: true },
  isAdmin = false,
  forceAdmin = false,
  children
}) => {
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempted = useRef(false);
  const forcedInitialization = useRef(false);
  const { toast } = useToast();

  // Log admin settings
  useEffect(() => {
    console.log("SessionProviderWrapper initialized with admin settings:", { 
      isAdmin, 
      forceAdmin,
      path: window.location.pathname
    });
  }, [isAdmin, forceAdmin]);

  useEffect(() => {
    if (initializationAttempted.current) return;
    
    console.log("Setting up initialization safety timeout, isAdmin:", isAdmin);
    
    const initialTimeout = isAdmin ? 3000 : 5000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (sessionMountedRef.current && !forcedInitialization.current) {
        console.log("Forcing provider initialization after timeout");
        forcedInitialization.current = true;
        onInitialized();
        toast({
          title: "Session initialization taking longer than expected",
          description: "We're still trying to connect to the session."
        });
      }
    }, initialTimeout);
    
    const criticalTimeout = isAdmin ? 6000 : 8000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && !forcedInitialization.current) {
        console.log("Critical initialization timeout reached, forcing initialization");
        forcedInitialization.current = true;
        onInitialized();
        onLoading(false);
        toast({
          title: "Session initialization taking longer than expected",
          description: "Please wait a moment while we complete setup.",
          variant: isAdmin ? "default" : "destructive"
        });
      }
    }, criticalTimeout);
    
    initializationAttempted.current = true;
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
      }
    };
  }, [onInitialized, sessionMountedRef, toast, onLoading, isAdmin]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
    >
      {(props: SessionContextProps) => {
        React.useEffect(() => {
          if (sessionMountedRef.current && !forcedInitialization.current) {
            const shouldInitialize = isAdmin ? true : (props.conversation && props.currentConversationId);
            
            if (shouldInitialize) {
              console.log("Provider successfully initialized with data:", {
                conversationId: props.currentConversationId,
                hasData: !!props.conversation,
                isAdmin: props.isAdmin,
                providedIsAdmin: isAdmin,
                forceAdmin
              });
              
              if (initializeTimeoutRef.current) {
                clearTimeout(initializeTimeoutRef.current);
                initializeTimeoutRef.current = null;
              }
              
              onInitialized();
            } else if (props.error) {
              console.log("Provider initialization with error:", props.error);
              onInitialized();
            }
          }
        }, [props.conversation, props.currentConversationId, props.error, props.isAdmin]);
        
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          isAdmin: props.isAdmin,
          providedIsAdmin: isAdmin,
          forceAdmin,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation,
          isConnected: props.isConnected || false,
          connectionAttempts: props.connectionAttempts || 0
        });
        
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            if ((isAdmin || forceAdmin) && props.isAdmin) {
              console.log("Admin detected in provider, ensuring loading state is properly updated");
              onLoading(false);
            } else {
              onLoading(props.isLoading);
            }
          }
        }, [props.isLoading, props.isAdmin]);
        
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            onError(props.error);
          }
        }, [props.error]);
        
        // Don't show loading state for admin mode when forceAdmin is true
        if (props.isLoading && !props.conversation && !((isAdmin || forceAdmin) && props.isAdmin)) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState 
            error={props.error} 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (!props.currentConversationId && !props.isLoading && !(isAdmin || forceAdmin)) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState 
            error="Session not found. Please try again." 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (children) {
          return children(props);
        }
        
        return (
          <SessionStateHandler
            props={props}
            isAdmin={props.isAdmin || isAdmin || forceAdmin}
            sessionStarted={props.sessionStarted || false}
            setSessionStarted={(started) => console.log("Session started:", started)}
            onSessionFull={handleSessionFull}
          />
        );
      }}
    </RefactoredSessionProvider>
  );
};

export default SessionProviderWrapper;
