
import React, { useEffect, useRef } from "react";
import { Send, Mic, MicOff, FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import MessageList from "@/components/chat/MessageList";
import { Message, ParticipantInfo } from "@/types/chat";
import SessionHeader from "./SessionHeader";
import AdminControls from "./AdminControls";
import { SessionContainerProps } from "@/types/session-container";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSessionInteractions } from "@/hooks/useSessionInteractions";
import { debugLog } from "@/utils/debugLogger";

const SessionContainer: React.FC<SessionContainerProps> = ({
  participantCount,
  conversation,
  messages,
  inputMessage,
  setInputMessage,
  currentParticipant,
  handleSendMessage,
  isWaitingForResponse,
  onGenerateReport,
  isGeneratingReport,
  setIsRecording,
  isRecording,
  participantColors,
  participantNames,
  participants,
  conversationId,
  facilitator,
  objective,
  currentParticipantCount,
  currentUserParticipantId,
  hasAnswered,
  totalResponses,
  viewMode,
  setViewMode,
  isAdmin,
  onSendAdminMessage,
  isAnonymous,
  toggleAnonymous
}) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);

  // Set up session interactions with force refresh capability
  const {
    isWaitingForResponses,
    responseCount,
    totalParticipants,
    reconnectRealtime
  } = useSessionInteractions({
    currentConversationId: conversationId,
    sessionState: {
      messages,
      setMessages: () => {}, // Not used in this context
      inputMessage,
      setInputMessage,
      currentParticipant,
      recordResponse: () => {}, // Not used in this context
      totalResponses,
      hasAnswered,
      viewMode
    },
    conversation,
    participants,
    isAnonymous,
    forceRefreshMessages: undefined // Will be handled by parent component
  });

  // Debug logging for message updates
  useEffect(() => {
    debugLog('all', `SessionContainer - Messages updated: ${messages.length} messages`);
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      debugLog('all', `Last message: ${lastMessage.sender} - ${lastMessage.content?.substring(0, 50)}...`);
    }
  }, [messages]);

  // Auto-focus input on desktop
  useEffect(() => {
    if (!isMobile && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMobile]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    toast({
      title: isRecording ? "Recording stopped" : "Recording started",
      description: isRecording ? 
        "Voice recording has been stopped." : 
        "Voice recording has been started.",
    });
  };

  const handleViewModeToggle = () => {
    const newMode = viewMode === "participant" ? "admin" : "participant";
    setViewMode(newMode);
    toast({
      title: `Switched to ${newMode} view`,
      description: newMode === "admin" ? 
        "You can now see admin features and controls." : 
        "You're now viewing as a participant.",
    });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <SessionHeader
        facilitator={facilitator}
        objective={objective}
        participantCount={participantCount}
        onGenerateReport={onGenerateReport}
        isGeneratingReport={isGeneratingReport}
        canGenerateReports={messages.length > 0}
        messagesCount={messages.length}
        viewMode={viewMode}
      />

      {/* Admin Controls */}
      {isAdmin && (
        <AdminControls
          onGenerateReport={onGenerateReport}
          isGeneratingReport={isGeneratingReport}
          onViewModeToggle={handleViewModeToggle}
          viewMode={viewMode}
          onSendAdminMessage={onSendAdminMessage}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          isWaitingForResponses={isWaitingForResponses}
          isMobile={isMobile}
        />
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          participantColors={participantColors}
          currentParticipant={`P${currentUserParticipantId}`}
          isWaitingForResponse={isWaitingForResponse}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          participants={participants}
          isMobile={isMobile}
          conversationData={conversation}
        />
      </div>

      {/* Input Area */}
      <div className="border-t bg-white p-3 sm:p-4">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Anonymous toggle for participants */}
          {!isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAnonymous}
              className={`${isMobile ? 'px-2' : 'px-3'} ${isAnonymous ? 'bg-gray-100' : ''}`}
            >
              {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {!isMobile && (isAnonymous ? 'Anonymous' : 'Named')}
            </Button>
          )}
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isAdmin ? "Send a message or question to participants..." : 
                         isAnonymous ? "Send an anonymous message..." : "Type your message..."}
              disabled={isWaitingForResponse}
              className="pr-20"
            />
            
            {/* Status badges */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
              {hasAnswered && !isAdmin && (
                <Badge variant="secondary" className="text-xs">
                  Responded
                </Badge>
              )}
              {isWaitingForResponse && (
                <Badge variant="outline" className="text-xs">
                  AI thinking...
                </Badge>
              )}
            </div>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isWaitingForResponse}
            size={isMobile ? "sm" : "default"}
          >
            <Send className="w-4 h-4" />
            {!isMobile && "Send"}
          </Button>

          {/* Voice recording toggle */}
          <Button
            variant="outline"
            onClick={handleToggleRecording}
            size={isMobile ? "sm" : "default"}
            className={isRecording ? "bg-red-50 border-red-200" : ""}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {!isMobile && (isRecording ? "Stop" : "Record")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionContainer;
