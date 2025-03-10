
import React, { useRef, useState } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import { SessionContextProps } from "@/types/session";
import SessionStateRenderer from "@/components/session/SessionStateRenderer";
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
  // Local state for session started
  const [sessionStarted, setSessionStarted] = useState(false);
  const effectiveAdmin = isAdmin || forceAdmin;
  
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

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={forceAdmin}
    >
      {(props: SessionContextProps) => {
        // Initialize session when data is available
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
        
        // Log provider props for debugging
        console.log("SessionProvider props:", {
          isLoading: props.isLoading,
          conversationId: props.currentConversationId,
          isAdmin: props.isAdmin,
          providedIsAdmin: isAdmin,
          forceAdmin,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0
        });
        
        // Update loading state based on conditions
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
        
        // Handle errors from provider
        React.useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            onError(props.error);
          }
        }, [props.error]);
        
        // Force admin status if needed
        if (forceAdmin && !props.isAdmin) {
          console.log("Forcing admin status in SessionProviderWrapper for forceAdmin=true");
          sessionStorage.setItem('isAdminSession', 'true');
        }
        
        // If custom children are provided, render them with enhanced props
        if (children) {
          return children({
            ...props,
            isAdmin: props.isAdmin || effectiveAdmin 
          });
        }
        
        // Render appropriate state based on current conditions
        return (
          <SessionStateRenderer
            props={props}
            isLoading={props.isLoading}
            error={error}
            effectiveAdmin={effectiveAdmin}
            retryConnection={retryConnection}
            connectionAttempts={connectionAttempts}
            sessionStarted={sessionStarted}
            setSessionStarted={setSessionStarted}
            handleSessionFull={handleSessionFull}
          />
        );
      }}
    </RefactoredSessionProvider>
  );
};

export default SessionProviderWrapper;
