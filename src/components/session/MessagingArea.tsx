
import React, { useState, useEffect } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessagingView from "./messaging/AdminMessagingView";
import ParticipantMessagingView from "./messaging/ParticipantMessagingView";

interface MessagingAreaProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  viewMode: "participant" | "admin";
  isAdmin: boolean;
  
  // Add props needed for input functionality
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  onSendMessage?: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
  hasAnswered?: boolean;
  totalResponses?: number;
  participantNames?: { [key: number]: string };
  currentUserParticipantId?: number | null;
}

const MessagingArea = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  participants,
  conversationId,
  currentParticipantCount,
  maxParticipants,
  isMobile,
  viewMode,
  isAdmin,
  
  // Input props with defaults
  inputMessage = '',
  setInputMessage = () => {},
  onSendMessage = () => {},
  isRecording = false,
  setIsRecording = () => {},
  isAnonymous = false,
  toggleAnonymous = () => {},
  hasAnswered = false,
  totalResponses = 0,
  participantNames = {},
  currentUserParticipantId = null
}: MessagingAreaProps) => {
  // State for admin filters and search
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Force admin persistence
  useEffect(() => {
    if (isAdmin || viewMode === "admin") {
      sessionStorage.setItem('isAdminSession', 'true');
    }
  }, [isAdmin, viewMode]);
  
  // Log messages count for debugging
  useEffect(() => {
    console.log(`MessagingArea: Rendering with ${messages.length} messages in ${viewMode} view`);
    
    // Check if we're in participant view
    if (viewMode === "participant" && !isAdmin) {
      // Log participant filtering information for debugging
      const participantKey = `P${currentParticipant}`;
      const userMsgCount = messages.filter(m => m.sender === "user" && m.participant === participantKey).length;
      const facilitatorMsgCount = messages.filter(m => m.sender === "assistant").length;
      const otherMsgCount = messages.length - userMsgCount - facilitatorMsgCount;
      
      console.log(`For participant ${participantKey}: user messages=${userMsgCount}, facilitator messages=${facilitatorMsgCount}, other messages=${otherMsgCount}`);
    }
  }, [messages, viewMode, isAdmin, currentParticipant]);
  
  // For participant view, we'll handle filtering in the MessageItem component
  // No filtering happens here, as it would be redundant with useMessageProcessor hook
  
  // Always use admin view if isAdmin=true or viewMode is admin
  if (isAdmin || viewMode === "admin") {
    return (
      <AdminMessagingView
        messages={messages}
        participantColors={participantColors}
        currentParticipantCount={currentParticipantCount}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showAnonymous={showAnonymous}
        setShowAnonymous={setShowAnonymous}
      />
    );
  }

  // Default to participant view
  return (
    <ParticipantMessagingView
      messages={messages} // Let ParticipantMessagingView handle filtering using the hooks
      participantColors={participantColors}
      currentParticipant={currentParticipant}
      isWaitingForResponse={isWaitingForResponse}
      participants={participants}
      conversationId={conversationId}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
      isMobile={isMobile}
      
      // Pass input props to the participant view
      inputMessage={inputMessage}
      setInputMessage={setInputMessage}
      onSendMessage={onSendMessage}
      isRecording={isRecording}
      setIsRecording={setIsRecording}
      isAnonymous={isAnonymous}
      toggleAnonymous={toggleAnonymous}
      hasAnswered={hasAnswered}
      totalResponses={totalResponses}
      viewMode={viewMode}
      participantNames={participantNames}
      currentUserParticipantId={currentUserParticipantId}
      showResponseStats={false} // Don't show response stats in participant view
    />
  );
};

export default React.memo(MessagingArea);
