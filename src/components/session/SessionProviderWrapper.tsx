
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
  const providerInitialized = useRef(false);
  const isOnAdminPath = window.location.pathname.includes('/admin');
  const showedAdminToast = useRef(false);
  
  // Persist admin status consistently
  useEffect(() => {
    if (effectiveAdmin || isOnAdminPath) {
      console.log("Setting admin status in session storage from SessionProviderWrapper");
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [effectiveAdmin, isOnAdminPath]);
  
  // Use admin status management hook
  useSessionProviderAdmin({ forceAdmin: effectiveAdmin || isOnAdminPath });

  // Use initialization hook
  const { forcedInitialization } = useSessionProviderInitialization({
    onInitialized,
    onLoading,
    sessionMountedRef,
    isAdmin: effectiveAdmin || isOnAdminPath,
    forceAdmin: effectiveAdmin || isOnAdminPath
  });

  // Force initialization after a timeout - reduced timeout for admin sessions
  useEffect(() => {
    const adminTimeout = isOnAdminPath ? 4000 : 8000;
    
    const initTimeout = setTimeout(() => {
      if (!providerInitialized.current) {
        console.log(`Force initializing provider after ${adminTimeout}ms timeout`);
        providerInitialized.current = true;
        onInitialized();
        onLoading(false);
        
        // Ensure admin status is persisted
        if (effectiveAdmin || isOnAdminPath) {
          sessionStorage.setItem('isAdminSession', 'true');
        }
      }
    }, adminTimeout);
    
    return () => clearTimeout(initTimeout);
  }, [onInitialized, onLoading, effectiveAdmin, isOnAdminPath]);

  // Log admin settings
  useEffect(() => {
    console.log("SessionProviderWrapper initialized with admin settings:", { 
      isAdmin, 
      forceAdmin,
      effectiveAdmin,
      isOnAdminPath,
      path: window.location.pathname,
      persistedAdmin: sessionStorage.getItem('isAdminSession')
    });
    
    // Show toast for admin users - but only once
    if ((effectiveAdmin || isOnAdminPath) && !showedAdminToast.current) {
      showedAdminToast.current = true;
      toast({
        title: "Admin Mode Active",
        description: "You are viewing this session as an administrator."
      });
      
      // Always ensure admin status is recorded
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [isAdmin, forceAdmin, effectiveAdmin, isOnAdminPath, toast]);

  return (
    <RefactoredSessionProvider 
      handleSessionFull={handleSessionFull}
      onError={onError}
      forceAdmin={effectiveAdmin || isOnAdminPath}
    >
      {(props: SessionContextProps) => {
        // Initialize session when data is available
        useEffect(() => {
          if (sessionMountedRef.current && !forcedInitialization.current && !providerInitialized.current) {
            const shouldInitialize = (effectiveAdmin || isOnAdminPath) ? true : (props.conversation && props.currentConversationId);
            
            if (shouldInitialize) {
              console.log("Provider successfully initialized with data:", {
                conversationId: props.currentConversationId,
                hasData: !!props.conversation,
                isAdmin: props.isAdmin,
                providedIsAdmin: isAdmin,
                forceAdmin,
                effectiveAdmin,
                isOnAdminPath
              });
              providerInitialized.current = true;
              onInitialized();
              
              // Ensure admin state is preserved
              if (effectiveAdmin || isOnAdminPath) {
                sessionStorage.setItem('isAdminSession', 'true');
              }
            } else if (props.error) {
              console.log("Provider initialization with error:", props.error);
              providerInitialized.current = true;
              onInitialized();
            }
          }
        }, [props.conversation, props.currentConversationId, props.error, props.isAdmin]);
        
        // Update loading state based on conditions - faster for admin
        useEffect(() => {
          if (sessionMountedRef.current) {
            if ((effectiveAdmin || isOnAdminPath) && (props.isAdmin || isOnAdminPath)) {
              console.log("Admin detected in provider, ensuring loading state is properly updated");
              onLoading(false);
              
              // Ensure admin status persists
              sessionStorage.setItem('isAdminSession', 'true');
            } else {
              onLoading(props.isLoading);
              
              // For participant sessions, force loading to false after a reasonable time
              if (props.isLoading && !(effectiveAdmin || isOnAdminPath)) {
                const timeout = setTimeout(() => {
                  console.log("Forcing loading state to false for participant session");
                  onLoading(false);
                }, 6000);
                
                return () => clearTimeout(timeout);
              }
            }
          }
        }, [props.isLoading, props.isAdmin]);
        
        // Handle errors from provider
        useEffect(() => {
          if (props.error && sessionMountedRef.current) {
            // Check if it's a "session full" error and we're admin before reporting
            const isSessionFullError = props.error.includes("full") || props.error.includes("maximum capacity");
            
            if (isSessionFullError && (effectiveAdmin || isOnAdminPath)) {
              console.log("🔑 Suppressing session full error for admin user");
              // Don't report the error for admin users
            } else {
              onError(props.error);
            }
          }
        }, [props.error]);
        
        // Force admin status if needed
        if ((effectiveAdmin || isOnAdminPath) && !props.isAdmin) {
          console.log("Forcing admin status in SessionProviderWrapper for admin user");
          sessionStorage.setItem('isAdminSession', 'true');
        }
        
        // If custom children are provided, render them with enhanced props
        if (children) {
          return children({
            ...props,
            isAdmin: props.isAdmin || effectiveAdmin || isOnAdminPath
          });
        }
        
        // Render appropriate state based on current conditions
        return (
          <SessionStateRenderer
            props={{
              ...props,
              isAdmin: props.isAdmin || effectiveAdmin || isOnAdminPath
            }}
            isLoading={props.isLoading}
            error={error}
            effectiveAdmin={effectiveAdmin || isOnAdminPath}
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
