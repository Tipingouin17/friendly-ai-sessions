
import React, { useMemo, useEffect } from 'react';
import MessageList from "@/components/chat/MessageList";
import SessionJoinInfo from "@/components/session/SessionJoinInfo";
import { Message, ParticipantInfo } from "@/types/chat";
import ParticipantResponseStats from './ParticipantResponseStats';

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
  // Log messages count for debugging
  useEffect(() => {
    console.log(`MessagingArea: Rendering with ${messages.length} messages in ${viewMode} view`);
    console.log("Participants count:", participants.length);
    console.log("Current participant count from props:", currentParticipantCount);
  }, [messages.length, viewMode, participants.length, currentParticipantCount]);
  
  // For participant view, filter messages to only show their own and facilitator messages
  const filteredMessages = useMemo(() => {
    if (viewMode === "participant") {
      return messages.filter(message => {
        // Always show facilitator messages
        if (message.sender === "assistant") return true;
        
        // Show this participant's messages
        if (message.sender === "user" && message.participant === `P${currentParticipant}`) return true;
        
        // Hide all other messages
        return false;
      });
    }
    
    // Admin view sees all messages
    return messages;
  }, [messages, viewMode, currentParticipant]);
  
  // Group messages by facilitator question for admin view
  const groupedMessages = useMemo(() => {
    if (viewMode !== "admin") return [];
    
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
        // Add participant response to the current group
        currentGroup.responses.push(message);
      }
    }
    
    // Add the last group if it has a question and responses
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
    console.log("Grouped message count:", groups.length);
    return groups;
  }, [messages, viewMode]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 overflow-hidden order-2 sm:order-1">
        {viewMode === "admin" ? (
          <div className="h-full overflow-y-auto">
            <div className="px-4 py-6 space-y-8">
              {groupedMessages.length > 0 ? (
                groupedMessages.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}-${group.question.id}`} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100">
                      <div className="font-medium text-gray-800 mb-1">Question {groupIndex + 1}</div>
                      <div className="text-gray-700">{group.question.content}</div>
                    </div>
                    
                    <ParticipantResponseStats 
                      responses={group.responses}
                      totalParticipants={maxParticipants}
                    />
                    
                    <div className="divide-y divide-gray-100">
                      {group.responses.map((response, responseIndex) => (
                        <div key={`response-${response.id}-${responseIndex}`} className="p-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: participantColors[response.participant] || '#888' }} 
                            />
                            <div className="text-sm font-medium flex items-center gap-1">
                              {response.isAnonymous ? 'Anonymous participant' : response.participant}
                              {response.isAnonymous && <span className="text-xs text-gray-500">(anonymous)</span>}
                            </div>
                          </div>
                          <div className="text-gray-700 pl-4">{response.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {messages.length > 0 ? 
                    "Processing messages... If you see this message for too long, try refreshing the page." :
                    "No messages to display. Start the conversation to see responses here."}
                </div>
              )}
            </div>
          </div>
        ) : (
          <MessageList 
            messages={filteredMessages} 
            participantColors={participantColors}
            currentParticipant={`P${currentParticipant}`}
            onLikeMessage={onLikeMessage}
            isWaitingForResponse={isWaitingForResponse}
            participants={participants}
          />
        )}
      </div>
      
      {/* Only show the QR code and participant count for admin view */}
      {!isMobile && viewMode === "admin" && (
        <div className="w-32 p-2 flex-shrink-0 border-l border-gray-100 order-1 sm:order-2">
          <SessionJoinInfo 
            conversationId={conversationId} 
            currentParticipantCount={currentParticipantCount}
            maxParticipants={maxParticipants}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(MessagingArea);
