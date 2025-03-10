
import React, { useRef, useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/session/AdminHeader";
import { useConversationId } from "@/hooks/useConversationId";
import { useConversation } from "@/hooks/useConversation";

const SessionAdmin = () => {
  const {
    isAdmin,
    sessionStarted,
    setSessionStarted,
    isLoading,
    setIsLoading,
    error,
    noSessionFound,
    connectionAttempts,
    lastAttemptTime,
    hasInitializedProvider,
    setHasInitializedProvider,
    sessionMountedRef,
    handleError,
    handleSessionFull,
    retryConnection
  } = useSessionPage();
  
  const { currentConversationId, locationState } = useConversationId();
  const { data: conversationData } = useConversation(currentConversationId);
  const { toast } = useToast();
  const pageLoadTime = useRef(Date.now());
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  
  // Ensure we're in admin mode
  const forceAdmin = true;
  
  // Log initialization on mount and set up safety timeouts
  useEffect(() => {
    console.log("Admin session page mounted", {
      time: new Date().toISOString(),
      isAdmin: true,
      hasError: !!error,
      noSessionFound,
      isLoading,
      currentConversationId,
      locationState,
      conversationData: conversationData?.sessions?.title
    });
    
    // Shorter timeouts for admin session
    const initialTimeout = 3000;
    const criticalTimeout = 5000;
    
    // Set a timeout to check if initialization takes too long
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.warn("Admin session initialization taking longer than expected");
        toast({
          title: "Preparing admin interface",
          description: "Please wait while we set up your admin dashboard.",
        });
      }
    }, initialTimeout);
    
    // Additional critical safety timeout
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.error("Critical timeout reached, admin session may be stuck");
        toast({
          title: "Continuing setup",
          description: "Your admin dashboard is almost ready.",
        });
        
        // Force clean state to allow UI to render
        setIsLoading(false);
        setHasInitializedProvider(true);
      }
    }, criticalTimeout);
    
    return () => {
      if (initializeTimeoutRef.current) {
        clearTimeout(initializeTimeoutRef.current);
        initializeTimeoutRef.current = null;
      }
    };
  }, [error, noSessionFound, isLoading, hasInitializedProvider, toast, setIsLoading, setHasInitializedProvider, currentConversationId, locationState, conversationData]);

  // Admin Welcome message
  useEffect(() => {
    const timer = setTimeout(() => {
      toast({
        title: "Welcome to Admin Dashboard",
        description: "You have access to all admin controls for this session.",
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [toast]);

  // If there's no conversation ID, redirect to the home page
  if (!currentConversationId && !isLoading && !locationState?.newConversationId) {
    console.error("No conversation ID found on admin page, redirecting home");
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        sessionTitle={conversationData?.sessions?.title || "Session Admin Panel"}
        facilitatorTitle={conversationData?.sessions?.facilitator_details?.title || ""}
      />
      
      <div className="flex-1">
        <SessionErrorBoundary
          error={error}
          noSessionFound={noSessionFound}
          retryConnection={retryConnection}
          connectionAttempts={connectionAttempts}
          isLoading={isLoading}
          hasInitializedProvider={hasInitializedProvider}
          lastAttemptTime={lastAttemptTime}
          isAdmin={true}
        >
          <SessionProviderWrapper
            onInitialized={() => {
              console.log(`Admin provider initialized after ${Date.now() - pageLoadTime.current}ms`);
              
              // Clear initialization timeout since we've successfully initialized
              if (initializeTimeoutRef.current) {
                clearTimeout(initializeTimeoutRef.current);
                initializeTimeoutRef.current = null;
              }
              
              setHasInitializedProvider(true);
              
              // For admin pages, ensure loading state is cleared faster
              setTimeout(() => {
                setIsLoading(false);
              }, 200);
            }}
            onLoading={setIsLoading}
            onError={handleError}
            handleSessionFull={handleSessionFull}
            retryConnection={retryConnection}
            connectionAttempts={connectionAttempts}
            error={error}
            sessionMountedRef={sessionMountedRef}
            isAdmin={true}  // Force admin mode
          />
        </SessionErrorBoundary>
      </div>
    </div>
  );
};

export default SessionAdmin;
