import React, { useRef, useEffect, useState } from "react";
import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useSessionPage } from "@/hooks/useSessionPage";
import SessionProviderWrapper from "@/components/session/SessionProviderWrapper";
import SessionErrorBoundary from "@/components/session/SessionErrorBoundary";
import { useToast } from "@/components/ui/use-toast";
import AdminHeader from "@/components/session/AdminHeader";
import { useConversationId } from "@/hooks/useConversationId";
import { useConversation } from "@/hooks/useConversation";
import AdminMessageInput from "@/components/session/AdminMessageInput";
import { useAdminSessionState } from "@/hooks/useAdminSessionState";
import ParticipantResponseStats from "@/components/session/ParticipantResponseStats";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Message, ParticipantInfo } from "@/types/chat";
import SessionView from "@/components/session/SessionView";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

const SessionAdmin = () => {
  // Force admin mode
  const { setAdminStatus } = useSessionAdminStatus();

  // Set admin status immediately
  useEffect(() => {
    // Always set admin session status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    // Create a safety timer to regularly check and enforce admin status
    const adminCheckInterval = setInterval(() => {
      // Re-establish admin status in case it got lost
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }, 2000);
    
    return () => {
      clearInterval(adminCheckInterval);
    };
  }, [setAdminStatus]);

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
  const { data: conversationData, isLoading: isConversationLoading } = useConversation(currentConversationId);
  const { toast } = useToast();
  const navigate = useNavigate();
  const pageLoadTime = useRef(Date.now());
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  const {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    sendAdminMessage,
    exportSessionData
  } = useAdminSessionState({
    conversationId: currentConversationId,
    currentUserParticipantId: null,
    participants,
    messages: sessionMessages,
    setMessages: setSessionMessages
  });
  
  // Force admin status
  const forceAdmin = true;
  
  // Check if we're on the admin path and redirect if needed
  useEffect(() => {
    const isAdminPath = location.pathname.includes('/admin');
    
    if (!isAdminPath && currentConversationId) {
      console.log("Not on admin path, redirecting to admin path");
      navigate(`/session/admin?id=${currentConversationId}`, {
        state: {
          isAdmin: true,
          showMessaging: true,
          conversationId: currentConversationId
        },
        replace: true
      });
    }
  }, [location.pathname, currentConversationId, navigate]);
  
  useEffect(() => {
    console.log("Admin session page mounted", {
      time: new Date().toISOString(),
      isAdmin: true,
      hasError: !!error,
      noSessionFound,
      isLoading,
      currentConversationId,
      locationState,
      conversationData: conversationData?.sessions?.title,
      path: location.pathname
    });
    
    // Ensure we're marked as admin
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    const initialTimeout = 3000;
    const criticalTimeout = 5000;
    
    initializeTimeoutRef.current = setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.warn("Admin session initialization taking longer than expected");
        toast({
          title: "Preparing admin interface",
          description: "Please wait while we set up your admin dashboard.",
        });
      }
    }, initialTimeout);
    
    setTimeout(() => {
      if (isLoading && !hasInitializedProvider) {
        console.error("Critical timeout reached, admin session may be stuck");
        toast({
          title: "Continuing setup",
          description: "Your admin dashboard is almost ready.",
        });
        
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
  }, [error, noSessionFound, isLoading, hasInitializedProvider, toast, setIsLoading, setHasInitializedProvider, currentConversationId, locationState, conversationData, location.pathname, setAdminStatus]);

  // Additional admin state check to redirect if needed
  useEffect(() => {
    // Extra protection for path - if we're not on the admin path but should be
    if (currentConversationId && !location.pathname.includes('/admin')) {
      console.log("Should be on admin path but not - redirecting");
      navigate(`/session/admin?id=${currentConversationId}`, { 
        state: { 
          isAdmin: true,
          showMessaging: true,
          conversationId: currentConversationId
        },
        replace: true
      });
    }
  }, [currentConversationId, location.pathname, navigate]);

  if (!currentConversationId && !isLoading && !locationState?.newConversationId) {
    console.error("No conversation ID found on admin page, redirecting home");
    return <Navigate to="/" />;
  }

  const handleSendAdminMessage = (message: string) => {
    if (!message.trim() || !currentConversationId) return;
    
    // Ensure admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    try {
      const notificationContent = {
        type: "admin_notification",
        message: message
      };
      
      supabase
        .from('messages')
        .insert({
          conversation_id: currentConversationId,
          content: notificationContent,
          role: 'admin',
          created_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) {
            console.error("Error sending admin notification:", error);
            toast({
              title: "Error",
              description: "Failed to send notification to participants",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Notification sent",
              description: "Your message has been sent to all participants",
            });
          }
        });
      
      sendAdminMessage(message, true);
    } catch (error) {
      console.error("Error in handleSendAdminMessage:", error);
      toast({
        title: "Error",
        description: "Failed to send message to participants",
        variant: "destructive"
      });
    }
  };

  const handleAdminMessage = (message: string, isPinned: boolean = false, recipientId?: string) => {
    // Ensure admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    handleSendAdminMessage(message);
  };

  if (!isLoading && hasInitializedProvider && !error) {
    return (
      <SessionProviderWrapper
        handleSessionFull={handleSessionFull}
        onError={handleError}
        forceAdmin={true}
      >
        {(props) => (
          <SessionErrorBoundary
            error={error}
            noSessionFound={noSessionFound}
            connectionAttempts={connectionAttempts}
            retryConnection={retryConnection}
            lastAttemptTime={lastAttemptTime || 0}
          >
            <SessionView 
              props={{
                ...props,
                onSendAdminMessage: handleSendAdminMessage,
                isAdmin: true // Force admin status
              }} 
              isAdmin={true} 
            />
          </SessionErrorBoundary>
        )}
      </SessionProviderWrapper>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pt-16">
      <AdminHeader 
        sessionTitle={conversationData?.sessions?.title || "Session Admin Panel"}
        facilitatorTitle={conversationData?.sessions?.facilitator_details?.title || ""}
        currentParticipants={conversationData?.current_participants || participants.length}
        maxParticipants={conversationData?.participants || 10}
        isSessionActive={!isSessionPaused}
        onToggleSessionState={toggleSessionState}
        onSendAdminMessage={handleSendAdminMessage}
        onExportData={exportSessionData}
      />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading || isConversationLoading || isLoadingMessages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="mb-2 text-xl font-medium">Loading session data...</h3>
                <p className="text-gray-500">
                  Please wait while we fetch the session information.
                </p>
              </div>
            </div>
          ) : sessionMessages.length > 0 ? (
            <>
              <div className="flex-1 overflow-auto">
                <div className="p-6 space-y-8">
                  {(() => {
                    const groups = [];
                    let currentGroup = { question: null, responses: [] };
                    
                    for (const message of sessionMessages) {
                      if (message.sender === "assistant" && !message.isReport && !message.isAdminMessage) {
                        if (currentGroup.question && currentGroup.responses.length > 0) {
                          groups.push({ ...currentGroup });
                        }
                        currentGroup = { 
                          question: message, 
                          responses: [] 
                        };
                      } else if (message.sender === "user" && currentGroup.question) {
                        currentGroup.responses.push(message);
                      }
                    }
                    
                    if (currentGroup.question && currentGroup.responses.length > 0) {
                      groups.push(currentGroup);
                    }
                    
                    return groups.map((group, groupIndex) => (
                      <div key={`group-${groupIndex}-${group.question.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-200">
                          <div className="text-lg font-medium text-gray-800 mb-2">Question {groupIndex + 1}</div>
                          <div className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{group.question.content}</div>
                        </div>
                        
                        <ParticipantResponseStats 
                          responses={group.responses}
                          totalParticipants={conversationData?.participants || participants.length}
                          showDetailedStats={true}
                        />
                        
                        <div className="divide-y divide-gray-100">
                          {group.responses.map((response, responseIndex) => {
                            const participant = participants.find(p => `P${p.id}` === response.participant);
                            return (
                              <div key={`response-${response.id}-${responseIndex}`} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][parseInt(response.participant?.substr(1) || '0') % 3] || '#888' }} 
                                  />
                                  <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                    {response.isAnonymous || participant?.isAnonymous ? 'Anonymous participant' : participant?.name || response.participant}
                                    {(response.isAnonymous || participant?.isAnonymous) && 
                                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">anonymous</span>
                                    }
                                  </div>
                                  <div className="text-xs text-gray-500 ml-auto">
                                    {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : ''}
                                  </div>
                                </div>
                                <div className="text-gray-700 pl-4 border-l-2 border-gray-100">{response.content}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
              
              <AdminMessageInput 
                onSendMessage={handleAdminMessage}
                participants={participants}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="mb-2 text-xl font-medium">Waiting for session data...</h3>
                <p className="text-gray-500">
                  No messages yet. The session may not have started.
                </p>
                <p className="text-gray-500 mt-2">
                  Session: {conversationData?.sessions?.title || "Unknown"}
                </p>
                <p className="text-gray-500">
                  Facilitator: {conversationData?.sessions?.facilitator_details?.title || "Unknown"}
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-gray-50 hidden md:block">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" /> 
            Participants ({participants.length}/{conversationData?.participants || 10})
          </h3>
          
          {isLoadingParticipants ? (
            <div className="text-center py-4 text-sm text-gray-500">
              Loading participants...
            </div>
          ) : participants.length > 0 ? (
            <div className="space-y-2">
              {participants.map(participant => (
                <div 
                  key={`participant-${participant.id}`}
                  className="p-2 bg-white rounded border border-gray-100 flex items-center gap-2"
                >
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][participant.id % 3] }} 
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{participant.name}</div>
                    {participant.isAnonymous && (
                      <div className="text-xs text-gray-500">Anonymous mode</div>
                    )}
                  </div>
                  <div className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                    Active
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-sm text-gray-500">
              No participants have joined yet.
            </div>
          )}
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Session: {conversationData?.sessions?.title || "Unknown"}</p>
            <p>Objective: {conversationData?.sessions?.objective || "Not specified"}</p>
            <p>Max participants: {conversationData?.participants || "Not specified"}</p>
            <p>Current participants: {conversationData?.current_participants || 0}</p>
            <p>Language: {conversationData?.language || "Not specified"}</p>
            <p>Session started: {conversationData?.session_started ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionAdmin;
