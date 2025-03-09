
import React, { useMemo, useEffect } from 'react';
import MessageList from "@/components/chat/MessageList";
import SessionJoinInfo from "@/components/session/SessionJoinInfo";
import { Message, ParticipantInfo } from "@/types/chat";
import ParticipantResponseStats from './ParticipantResponseStats';
import { Share2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  }, [messages.length, viewMode]);
  
  // For participant view, filter messages to only show their own and facilitator messages
  const filteredMessages = useMemo(() => {
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
    
    return groups;
  }, [messages, viewMode]);

  if (viewMode === "admin") {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-hidden">
          {groupedMessages.length > 0 ? (
            <div className="h-full overflow-y-auto">
              <div className="px-6 py-6 space-y-8">
                {groupedMessages.map((group, groupIndex) => (
                  <div key={`group-${groupIndex}-${group.question.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200">
                      <div className="text-lg font-medium text-gray-800 mb-2">Question {groupIndex + 1}</div>
                      <div className="text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{group.question.content}</div>
                    </div>
                    
                    <ParticipantResponseStats 
                      responses={group.responses}
                      totalParticipants={maxParticipants}
                    />
                    
                    <div className="divide-y divide-gray-100">
                      {group.responses.map((response, responseIndex) => (
                        <div key={`response-${response.id}-${responseIndex}`} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: participantColors[response.participant] || '#888' }} 
                            />
                            <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                              {response.isAnonymous ? 'Anonymous participant' : response.participant}
                              {response.isAnonymous && 
                                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">anonymous</span>
                              }
                            </div>
                          </div>
                          <div className="text-gray-700 pl-4 border-l-2 border-gray-100">{response.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
              <div className="mb-4 p-4 bg-gray-50 rounded-full">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="max-w-md">
                {messages.length > 0 ? 
                  "Processing messages... If you see this message for too long, try refreshing the page." :
                  "Share the QR code with participants to begin the session."}
              </p>
              
              <div className="mt-6 flex gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center gap-2"
                  onClick={() => window.navigator.clipboard.writeText(window.location.href)}
                >
                  <Share2 className="w-4 h-4" /> Copy session link
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default to participant view
  return (
    <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
      <div className="flex-1 overflow-hidden order-2 sm:order-1">
        <MessageList 
          messages={filteredMessages} 
          participantColors={participantColors}
          currentParticipant={`P${currentParticipant}`}
          onLikeMessage={onLikeMessage}
          isWaitingForResponse={isWaitingForResponse}
          participants={participants}
        />
      </div>
      
      {/* Only show the participant count for participant view */}
      {!isMobile && viewMode === "participant" && (
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
