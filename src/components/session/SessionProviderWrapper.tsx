
import React, { useRef, useState, useEffect } from "react";
import { RefactoredSessionProvider } from "@/components/session/RefactoredSessionProvider";
import { SessionContextProps } from "@/types/session";
import SessionStateRenderer from "@/components/session/SessionStateRenderer";
import { useSessionProviderInitialization } from "@/hooks/useSessionProviderInitialization";
import { useSessionProviderAdmin } from "@/hooks/useSessionProviderAdmin";
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
  // Local state for session started
  const [sessionStarted, setSessionStarted] = useState(false);
  const effectiveAdmin = isAdmin || forceAdmin || sessionStorage.getItem('isAdminSession') === 'true';
  const { toast } = useToast();
  
  // Persist admin status when detected
  useEffect(() => {
    if (effectiveAdmin) {
      console.log("Setting admin status in session storage from SessionProviderWrapper");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin]);
  
  // Use admin status management hook
  useSessionProviderAdmin({ forceAdmin: effectiveAdmin });

  // Use initialization hook
  const { forcedInitialization } = useSessionProviderInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    isAdmin: effectiveAdmin,
    forceAdmin: effectiveAdmin
  });

  // Log admin settings
  useEffect(() => {
    console.log("SessionProviderWrapper initialized with admin settings:", { 
      isAdmin, 
      forceAdmin,
      effectiveAdmin,
      path: window.location.pathname,
      persistedAdmin: sessionStorage.getItem('isAdminSession')
    });
    
    // Show toast for admin users
    if (effectiveAdmin) {
      toast({
        title: "Admin Mode Active",
        description: "You are viewing this session as an administrator."
      });
    }
  }, [isAdmin, forceAdmin, effectiveAdmin, toast]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={effectiveAdmin}
    >
      {(props: SessionContextProps) => {
        // Initialize session when data is available
        useEffect(() => {
          if (sessionMountedRef.current && !forcedInitialization.current) {
            const shouldInitialize = effectiveAdmin ? true : (props.conversation && props.currentConversationId);
            
            if (shouldInitialize) {
              console.log("Provider successfully initialized with data:", {
                conversationId: props.currentConversationId,
                hasData: !!props.conversation,
                isAdmin: props.isAdmin,
                providedIsAdmin: isAdmin,
                forceAdmin,
                effectiveAdmin
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
          effectiveAdmin,
          messagesCount: props.sessionState?.messages?.length || 0,
          participantsCount: props.participants?.length || 0
        });
        
        // Update loading state based on conditions
        useEffect(() => {
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
        useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            // Check if it's a "session full" error and we're admin before reporting
            const isSessionFullError = props.error.includes("full") || props.error.includes("maximum capacity");
            
            if (isSessionFullError && effectiveAdmin) {
              console.log("🔑 Suppressing session full error for admin user");
              // Don't report the error for admin users
            } else {
              onError(props.error);
            }
          }
        }, [props.error]);
        
        // Force admin status if needed
        if (effectiveAdmin && !props.isAdmin) {
          console.log("Forcing admin status in SessionProviderWrapper for admin user");
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
            props={{
              ...props,
              isAdmin: props.isAdmin || effectiveAdmin
            }}
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
