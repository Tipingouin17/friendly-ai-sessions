
import React, { useState } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessagingView from "./messaging/AdminMessagingView";
import ParticipantMessagingView from "./messaging/ParticipantMessagingView";

interface MessagingAreaProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  onLikeMessage?: (messageId: string) => void;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  viewMode: "participant" | "admin";
}

const MessagingArea = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  onLikeMessage,
  participants,
  conversationId,
  currentParticipantCount,
  maxParticipants,
  isMobile,
  viewMode
}: MessagingAreaProps) => {
  // State for admin filters and search
  const [showAnonymous, setShowAnonymous] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Log messages count for debugging
  React.useEffect(() => {
    console.log(`MessagingArea: Rendering with ${messages.length} messages in ${viewMode} view`);
  }, [messages.length, viewMode]);
  
  // For participant view, filter messages to only show their own and facilitator messages
  const filteredMessages = React.useMemo(() => {
    if (viewMode === "participant") {
      return messages.filter(message => {
        // Always show facilitator messages
        if (message.sender === "assistant") {
          return true;
        }
        
        // Show this participant's messages
        const participantKey = `P${currentParticipant}`;
        if (message.sender === "user" && message.participant === participantKey) {
          return true;
        }
        
        return false;
      });
    }
    
    return messages;
  }, [messages, viewMode, currentParticipant]);

  if (viewMode === "admin") {
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
      messages={filteredMessages}
      participantColors={participantColors}
      currentParticipant={currentParticipant}
      isWaitingForResponse={isWaitingForResponse}
      onLikeMessage={onLikeMessage}
      participants={participants}
      conversationId={conversationId}
      currentParticipantCount={currentParticipantCount}
      maxParticipants={maxParticipants}
      isMobile={isMobile}
    />
  );
};

export default React.memo(MessagingArea);
