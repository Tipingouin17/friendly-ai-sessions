
import React from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import JoinSessionLoadingState from "@/components/session/JoinSessionLoadingState";
import { SessionContextProps } from "@/types/session";
import SessionStateHandler from "@/components/session/SessionStateHandler";
import { useSessionProviderInitialization } from "@/hooks/useSessionProviderInitialization";
import { useSessionProviderAdmin } from "@/hooks/useSessionProviderAdmin";

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
  // Use admin status management hook
  useSessionProviderAdmin({ forceAdmin });

  // Use initialization hook
  const { forcedInitialization } = useSessionProviderInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    isAdmin,
    forceAdmin
  });

  // Log admin settings
  React.useEffect(() => {
    console.log("SessionProviderWrapper initialized with admin settings:", { 
      isAdmin, 
      forceAdmin,
      path: window.location.pathname,
      persistedAdmin: sessionStorage.getItem('isAdminSession')
    });
  }, [isAdmin, forceAdmin]);

  const effectiveAdmin = isAdmin || forceAdmin;

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={forceAdmin}
    >
      {(props: SessionContextProps) => {
        React.useEffect(() => {
          if (sessionMountedRef.current && !forcedInitialization.current) {
            const shouldInitialize = effectiveAdmin ? true : (props.conversation && props.currentConversationId);
            
            if (shouldInitialize) {
              console.log("Provider successfully initialized with data:", {
                conversationId: props.currentConversationId,
                hasData: !!props.conversation,
                isAdmin: props.isAdmin,
                providedIsAdmin: isAdmin,
                forceAdmin
              });
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
            if (effectiveAdmin && props.isAdmin) {
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
        
        if (props.isLoading && !props.conversation && !(effectiveAdmin && props.isAdmin)) {
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
        
        if (!props.currentConversationId && !props.isLoading && !effectiveAdmin) {
          console.error("No conversation ID found in session provider, but no error was returned");
          return <JoinSessionLoadingState 
            error="Session not found. Please try again." 
            onRetry={retryConnection}
            retryCount={connectionAttempts} 
          />;
        }
        
        if (forceAdmin && !props.isAdmin) {
          console.log("Forcing admin status in SessionProviderWrapper for forceAdmin=true");
          sessionStorage.setItem('isAdminSession', 'true');
        }
        
        if (children) {
          return children({
            ...props,
            isAdmin: props.isAdmin || effectiveAdmin 
          });
        }
        
        return (
          <SessionStateHandler
            props={{
              ...props,
              isAdmin: props.isAdmin || effectiveAdmin
            }}
            isAdmin={props.isAdmin || effectiveAdmin}
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
