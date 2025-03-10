
import React, { useRef, useEffect, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
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
  const { data: conversationData, isLoading: isConversationLoading } = useConversation(currentConversationId);
  const { toast } = useToast();
  const pageLoadTime = useRef(Date.now());
  const initializeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();
  
  // Use state for real data from the database
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  
  // Use our custom admin session state hook
  const {
    isSessionPaused,
    isExporting,
    toggleSessionState,
    sendAdminMessage,
    exportSessionData
  } = useAdminSessionState({
    conversationId: currentConversationId,
    currentUserParticipantId: null, // Admin doesn't have a participant ID
    participants,
    messages: sessionMessages,
    setMessages: setSessionMessages
  });
  
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
        description: `You have access to all admin controls for ${conversationData?.sessions?.title || 'this session'}.`,
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [toast, conversationData]);
  
  // Fetch real participant data from session_participants table
  useEffect(() => {
    if (!currentConversationId) return;
    
    const fetchParticipants = async () => {
      setIsLoadingParticipants(true);
      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', currentConversationId);
        
        if (error) {
          console.error('Error fetching participants:', error);
          return;
        }
        
        if (data) {
          const formattedParticipants: ParticipantInfo[] = data.map(p => ({
            id: p.participant_id,
            name: p.name,
            avatar: p.avatar_seed ? `https://ui-avatars.com/api/?name=${p.name}` : "https://ui-avatars.com/api/?name=Anonymous",
            isAnonymous: p.is_anonymous
          }));
          
          setParticipants(formattedParticipants);
        }
      } catch (error) {
        console.error('Error in fetchParticipants:', error);
      } finally {
        setIsLoadingParticipants(false);
      }
    };
    
    fetchParticipants();
    
    // Set up real-time subscription for participant changes
    const channel = supabase
      .channel('public:session_participants')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `conversation_id=eq.${currentConversationId}`
      }, () => {
        fetchParticipants(); // Refetch on any changes
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);
  
  // Fetch real message data from the messages table
  useEffect(() => {
    if (!currentConversationId) return;
    
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }
        
        if (data) {
          // Transform database messages to the Message type format
          const formattedMessages: Message[] = data.map(msg => {
            const content = typeof msg.content === 'string' 
              ? msg.content 
              : typeof msg.content === 'object' && msg.content !== null
                ? JSON.stringify(msg.content)
                : '';
            
            return {
              id: msg.id.toString(),
              content: content,
              sender: msg.role === 'assistant' ? 'assistant' : 'user',
              timestamp: new Date(msg.created_at),
              created_at: msg.created_at,
              participant: msg.name ? `P${msg.name}` : undefined,
              isAdminMessage: msg.role === 'admin',
              isPinned: msg.content && typeof msg.content === 'object' && msg.content !== null 
                ? msg.content.isPinned 
                : false
            };
          });
          
          setSessionMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error in fetchMessages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // Set up real-time subscription for message changes
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${currentConversationId}`
      }, () => {
        fetchMessages(); // Refetch on any changes
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversationId]);

  // If there's no conversation ID, redirect to the home page
  if (!currentConversationId && !isLoading && !locationState?.newConversationId) {
    console.error("No conversation ID found on admin page, redirecting home");
    return <Navigate to="/" />;
  }

  // Handle sending an admin message
  const handleAdminMessage = (message: string, isPinned: boolean, recipientId?: string) => {
    sendAdminMessage(message, isPinned, recipientId);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <AdminHeader 
        sessionTitle={conversationData?.sessions?.title || "Session Admin Panel"}
        facilitatorTitle={conversationData?.sessions?.facilitator_details?.title || ""}
        currentParticipants={conversationData?.current_participants || participants.length}
        maxParticipants={conversationData?.participants || 10}
        isSessionActive={!isSessionPaused}
        onToggleSessionState={toggleSessionState}
        onSendAdminMessage={() => {}} // This would normally open a dialog
        onExportData={exportSessionData}
      />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Main content area */}
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
                {/* Group messages by questions as in MessagingArea admin view */}
                <div className="p-6 space-y-8">
                  {/* Group messages by facilitator questions */}
                  {(() => {
                    const groups = [];
                    let currentGroup = { question: null, responses: [] };
                    
                    // Loop through all messages to create question-answer groups
                    for (const message of sessionMessages) {
                      if (message.sender === "assistant" && !message.isReport && !message.isAdminMessage) {
                        // If we have an existing group with responses, add it to our groups array
                        if (currentGroup.question && currentGroup.responses.length > 0) {
                          groups.push({ ...currentGroup });
                        }
                        
                        // Start a new group with this facilitator question
                        currentGroup = { 
                          question: message, 
                          responses: [] 
                        };
                      } else if (message.sender === "user" && currentGroup.question) {
                        // Add participant response to the current group
                        currentGroup.responses.push(message);
                      }
                    }
                    
                    // Add the last group if it has a question and responses
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
              
              {/* Admin message input */}
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
        
        {/* Right sidebar for participant info */}
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
