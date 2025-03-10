
import React, { useEffect, useRef } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { SessionContextProps } from "@/types/session";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { useToast } from "@/components/ui/use-toast";

interface SessionProviderWrapperProps {
  onInitialized: () => void;
  onLoading: (isLoading: boolean) => void;
  onError: (error: string) => void;
  handleSessionFull: () => void;
  retryConnection: () => void;
  connectionAttempts: number;
  error: string | null;
  sessionMountedRef: React.RefObject<boolean>;
  isAdmin?: boolean;
}

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized,
  onLoading,
  onError,
  handleSessionFull,
  retryConnection,
  connectionAttempts,
  error,
  sessionMountedRef,
  isAdmin = false
}) => {
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempted = useRef(false);
  const forcedInitialization = useRef(false);
  const { toast } = useToast();

  // Set up initialization timeout to prevent stuck states - shorter timeouts for admin
  useEffect(() => {
    if (initializationAttempted.current) return;
    
    console.log("Setting up initialization safety timeout, isAdmin:", isAdmin);
    
    // Set a safety timeout to ensure we declare provider initialized even if there's an issue
    // Use faster timeout for admin
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
    
    // Add a second safety timeout for critical failures - shorter for admin
    const criticalTimeout = isAdmin ? 6000 : 8000;
    
    setTimeout(() => {
      if (sessionMountedRef.current && !forcedInitialization.current) {
        console.log("Critical initialization timeout reached, forcing initialization");
        forcedInitialization.current = true;
        onInitialized();
        onLoading(false); // Force loading to false as well
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
        // Initialize provider when first mounted with successful data
        React.useEffect(() => {
          if (sessionMountedRef.current && !forcedInitialization.current) {
            // For admin, we can initialize faster even if data isn't fully loaded
            const shouldInitialize = isAdmin ? true : (props.conversation && props.currentConversationId);
            
            if (shouldInitialize) {
              console.log("Provider successfully initialized with data:", {
                conversationId: props.currentConversationId,
                hasData: !!props.conversation,
                isAdmin: props.isAdmin,
                providedIsAdmin: isAdmin
              });
              
              // Clear safety timeout since we're initializing
              if (initializeTimeoutRef.current) {
                clearTimeout(initializeTimeoutRef.current);
                initializeTimeoutRef.current = null;
              }
              
              onInitialized();
            } else if (props.error) {
              // If we have an error, we should also initialize to stop showing loading state
              console.log("Provider initialization with error:", props.error);
              onInitialized();
            }
          }
        }, [props.conversation, props.currentConversationId, props.error, props.isAdmin]);
        
        // Log provider state 
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          isAdmin: props.isAdmin,
          providedIsAdmin: isAdmin,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0,
          isSessionStartedInDB: props.isSessionStartedInDB,
          error: props.error,
          hasConversation: !!props.conversation,
          isConnected: props.isConnected || false,
          connectionAttempts: props.connectionAttempts || 0
        });
        
        // Update loading state when it changes
        React.useEffect(() => {
          if (sessionMountedRef.current) {
            // For admin, we might want to force loading to false more aggressively
            if (isAdmin && props.isAdmin) {
              console.log("Admin detected in provider, ensuring loading state is properly updated");
              onLoading(false);
            } else {
              onLoading(props.isLoading);
            }
          }
        }, [props.isLoading, props.isAdmin]);
        
        // Update error state when it changes
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            onError(props.error);
          }
        }, [props.error]);
        
        // Show loading state if still loading, but not for admin after loading
        if (props.isLoading && !props.conversation && !(isAdmin && props.isAdmin)) {
          console.log("Showing provider loading state");
          return <JoinSessionLoadingState 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Show error state if there's an error
        if (props.error) {
          console.log("Showing provider error state:", props.error);
          return <JoinSessionLoadingState 
            error={props.error} 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Show error if no conversation ID is found - but bypass for admin
        if (!props.currentConversationId && !props.isLoading && !isAdmin) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState 
            error="Session not found. Please try again." 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        // Render the session state handler component
        return (
          <SessionStateHandler
            props={props}
            isAdmin={props.isAdmin || isAdmin}
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
