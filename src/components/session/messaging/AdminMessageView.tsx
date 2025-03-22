
import React, { useMemo, useEffect } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';

interface AdminMessageViewProps {
  messages: Message[];
  participants: ParticipantInfo[];
  participantColors: { [key: string]: string };
}

const AdminMessageView: React.FC<AdminMessageViewProps> = ({
  messages,
  participants,
  participantColors
}) => {
  // Log messages for debugging
  useEffect(() => {
    console.log("Admin message view received messages:", messages.length);
  }, [messages]);

  // Group messages by facilitator question for admin view
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = { question: null, responses: [] };
    
    // If we have no messages yet, return empty array
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Handle welcome message special case - if we have an assistant message but no responses yet
    const welcomeMessage = messages.find(m => m.sender === "assistant");
    if (welcomeMessage && !messages.some(m => m.sender === "user")) {
      console.log("Admin view: Found welcome message with no responses yet");
      return [{
        question: welcomeMessage,
        responses: []
      }];
    }
    
    // Regular processing - group by question/answer
    for (const message of messages) {
      if (message.sender === "assistant" && !message.isReport) {
        // When we find a facilitator message, start a new group
        if (currentGroup.question) {
          groups.push({ ...currentGroup });
        }
        
        currentGroup = { 
          question: message, 
          responses: [] 
        };
      } else if (message.sender === "user" && currentGroup.question) {
        // Add participant responses to the current group
        currentGroup.responses.push(message);
      } else if (message.sender === "user" && !currentGroup.question && messages.length > 0) {
        // Case: User message without a preceding facilitator message
        // Create a default group if needed
        currentGroup = {
          question: {
            id: "default-question",
            content: "Initial responses",
            sender: "assistant",
            timestamp: new Date()
          },
          responses: [message]
        };
      }
    }
    
    // Add the last group if it exists
    if (currentGroup.question) {
      groups.push({ ...currentGroup });
    }
    
    console.log("Admin view: Created message groups:", groups.length);
    return groups;
  }, [messages]);

  if (groupedMessages.length === 0) {
    return (
      <MessageEmptyState
        isAdmin={true}
        messagesLength={messages.length}
        viewMode="admin"
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-6 py-6 space-y-8">
        {groupedMessages.map((group, groupIndex) => (
          <AdminMessageGroup
            key={`group-${groupIndex}-${group.question.id}`}
            group={group}
            groupIndex={groupIndex}
            participantColors={participantColors}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminMessageView;
