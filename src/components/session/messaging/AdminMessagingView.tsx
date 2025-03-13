
import React, { useMemo } from 'react';
import { Message } from '@/types/chat';
import AdminMessageFilters from './AdminMessageFilters';
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';

interface AdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  showAnonymous: boolean;
  setShowAnonymous: (show: boolean) => void;
}

const AdminMessagingView: React.FC<AdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  searchTerm,
  setSearchTerm,
  showAnonymous,
  setShowAnonymous
}) => {
  // Log all messages for debugging
  React.useEffect(() => {
    console.log("Admin view received messages:", 
      messages.map(m => ({
        id: m.id,
        sender: m.sender,
        content: m.content.substring(0, 20) + "...",
        participant: m.participant
      }))
    );
  }, [messages]);

  // Group messages by facilitator question for admin view
  const groupedMessages = useMemo(() => {
    console.log("Grouping messages for admin view:", messages.length);

    // If we don't have any assistant messages yet but have user messages,
    // create a default group with a placeholder question
    if (messages.length > 0 && !messages.some(m => m.sender === "assistant")) {
      const userMessages = messages.filter(m => 
        m.sender === "user" && 
        (showAnonymous || !m.isAnonymous) &&
        (!searchTerm || m.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (userMessages.length > 0) {
        console.log("Creating default group for user messages without facilitator prompt");
        return [{
          question: {
            id: "default-question",
            content: "Participant messages",
            sender: "assistant",
            timestamp: new Date()
          },
          responses: userMessages
        }];
      }
    }

    const groups = [];
    let currentGroup = { question: null, responses: [] };

    // Loop through all messages to create question-answer groups
    for (const message of messages) {
      if (message.sender === "assistant" && !message.isReport) {
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
        // Add participant response to the current group if it passes filters
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      } else if (message.sender === "user" && !currentGroup.question) {
        // This is a user message without a preceding facilitator message
        // Create a default group if needed
        if (groups.length === 0 && !currentGroup.question) {
          currentGroup = {
            question: {
              id: "default-question",
              content: "Participant messages",
              sender: "assistant",
              timestamp: new Date()
            },
            responses: []
          };
        }
        
        // Add to the current group
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      }
    }
    
    // Add the last group if it has responses
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
    console.log("Created message groups:", groups.length);
    return groups;
  }, [messages, showAnonymous, searchTerm]);

  // Calculate total responses for the filter stats
  const totalResponses = groupedMessages.reduce((acc, group) => acc + group.responses.length, 0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <AdminMessageFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        showAnonymous={showAnonymous}
        setShowAnonymous={setShowAnonymous}
        totalResponses={totalResponses}
        currentParticipantCount={currentParticipantCount}
      />

      <div className="flex-1 overflow-hidden">
        {groupedMessages.length > 0 ? (
          <div className="h-full overflow-y-auto">
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
        ) : (
          <MessageEmptyState
            isAdmin={true}
            messagesLength={messages.length}
            viewMode="admin"
          />
        )}
      </div>
    </div>
  );
};

export default AdminMessagingView;
