
import React, { useState, useEffect } from 'react';
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
  isAdmin: boolean;
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
  viewMode,
  isAdmin
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
    console.log(`MessagingArea: Rendering with ${messages.length} messages in ${viewMode} view`, 
      messages.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content.substring(0, 20) + "...",
        participant: m.participant
      }))
    );
  }, [messages, viewMode]);
  
  // For participant view, filter messages to only show their own and facilitator messages
  const filteredMessages = React.useMemo(() => {
    if (viewMode === "participant") {
      console.log("Filtering messages for participant view", {
        currentParticipant,
        participantKey: `P${currentParticipant}`
      });
      
      return messages.filter(message => {
        // Always show facilitator messages
        if (message.sender === "assistant") {
          return true;
        }
        
        // Show this participant's messages
        const participantKey = `P${currentParticipant}`;
        if (message.sender === "user" && message.participant === participantKey) {
          console.log("Including participant message:", message.content.substring(0, 20));
          return true;
        }
        
        console.log("Filtering out message:", message.content.substring(0, 20), "from participant", message.participant);
        return false;
      });
    }
    
    return messages;
  }, [messages, viewMode, currentParticipant]);

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
