
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
  // Group messages by facilitator question for admin view
  const groupedMessages = useMemo(() => {
    console.log("Grouping messages for admin view:", messages.length);

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
      }
    }
    
    // Add the last group if it has a question and responses
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
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
