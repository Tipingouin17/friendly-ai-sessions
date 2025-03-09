
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
}

const SessionProviderWrapper: React.FC<SessionProviderWrapperProps> = ({
  onInitialized,
  onLoading,
  onError,
  handleSessionFull,
  retryConnection,
  connectionAttempts,
  error,
  sessionMountedRef
}) => {
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializationAttempted = useRef(false);
  const { toast } = useToast();

  // Set up initialization timeout to prevent stuck states
  useEffect(() => {
    if (initializationAttempted.current) return;
    
    console.log("Setting up initialization safety timeout");
    
    // Set a safety timeout to ensure we declare provider initialized even if there's an issue
    initializeTimeoutRef.current = setTimeout(() => {
      if (sessionMountedRef.current) {
        console.log("Forcing provider initialization after timeout");
        onInitialized();
        toast({
          title: "Session initialization taking longer than expected",
          description: "We're still trying to connect to the session."
        });
      }
    }, 8000); // 8 second safety timeout
    
    initializationAttempted.current = true;
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
      }
    };
  }, [onInitialized, sessionMountedRef, toast]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
    >
      {(props: SessionContextProps) => {
        // Initialize provider when first mounted with successful data
        React.useEffect(() => {
          if (sessionMountedRef.current && props.conversation && props.currentConversationId) {
            console.log("Provider successfully initialized with data:", {
              conversationId: props.currentConversationId,
              hasData: !!props.conversation
            });
            
            // Clear safety timeout since we have real data
            if (initializeTimeoutRef.current) {
              clearTimeout(initializeTimeoutRef.current);
              initializeTimeoutRef.current = null;
            }
            
            onInitialized();
          }
        }, [props.conversation, props.currentConversationId]);
        
        // Log provider state 
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
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
            onLoading(props.isLoading);
          }
        }, [props.isLoading]);
        
        // Update error state when it changes
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            onError(props.error);
          }
        }, [props.error]);
        
        // Show loading state if still loading
        if (props.isLoading && !props.conversation) {
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
        
        // Show error if no conversation ID is found
        if (!props.currentConversationId && !props.isLoading) {
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
            isAdmin={props.isAdmin || false}
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
