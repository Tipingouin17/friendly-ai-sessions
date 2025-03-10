
import React, { useMemo, useEffect, useState } from 'react';
import MessageList from "@/components/chat/MessageList";
import SessionJoinInfo from "@/components/session/SessionJoinInfo";
import { Message, ParticipantInfo } from "@/types/chat";
import ParticipantResponseStats from './ParticipantResponseStats';
import { Share2, Users, Eye, EyeOff, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Toggle } from '@/components/ui/toggle';

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
    
    // Admin view filter
    let adminFilteredMessages = messages;
    
    // Apply anonymous filter if needed
    if (!showAnonymous) {
      adminFilteredMessages = adminFilteredMessages.filter(
        message => !message.isAnonymous
      );
    }
    
    // Apply search if needed
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      adminFilteredMessages = adminFilteredMessages.filter(
        message => message.content.toLowerCase().includes(term)
      );
    }
    
    return adminFilteredMessages;
  }, [messages, viewMode, currentParticipant, showAnonymous, searchTerm]);
  
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
  }, [messages, viewMode, showAnonymous, searchTerm]);

  if (viewMode === "admin") {
    return (
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="flex-1">
              <Input
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Toggle 
              pressed={showAnonymous} 
              onPressedChange={setShowAnonymous}
              size="sm"
              aria-label="Toggle anonymous responses"
              className="flex items-center gap-1"
            >
              {showAnonymous ? 
                <Eye className="h-4 w-4" /> : 
                <EyeOff className="h-4 w-4" />
              }
              Anonymous
            </Toggle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setShowAnonymous(!showAnonymous)}>
                  {showAnonymous ? "Hide Anonymous" : "Show Anonymous"}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSearchTerm('')}>
                  Clear Search
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="text-sm text-gray-500">
            Showing {groupedMessages.reduce((acc, group) => acc + group.responses.length, 0)} responses 
            from {currentParticipantCount || 0} participants
          </div>
        </div>

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
                      showDetailedStats={true}
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
                            <div className="text-xs text-gray-500 ml-auto">
                              {response.timestamp ? new Date(response.timestamp).toLocaleTimeString() : ''}
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
                  "No matching responses found. Try changing your filters." :
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
