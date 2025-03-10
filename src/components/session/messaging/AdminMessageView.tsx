
import React, { useMemo } from 'react';
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
  // Group messages by facilitator question for admin view
  const groupedMessages = useMemo(() => {
    const groups = [];
    let currentGroup = { question: null, responses: [] };
    
    for (const message of messages) {
      if (message.sender === "assistant" && !message.isReport) {
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
