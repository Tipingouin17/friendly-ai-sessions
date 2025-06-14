
import React, { useMemo, useState } from 'react';
import { Message } from '@/types/chat';
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Eye, EyeOff } from 'lucide-react';

interface SimplifiedAdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
}

const SimplifiedAdminMessagingView: React.FC<SimplifiedAdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnonymous, setShowAnonymous] = useState(true);
  
  // Create participant name mapping
  const participantNameMap = useMemo(() => {
    const nameMap: { [key: string]: string } = {};
    
    messages.forEach(message => {
      if (message.participant && typeof message.participant === 'string') {
        if (!message.participant.startsWith('P') || message.participant.includes(' ')) {
          const participantId = message.participant.startsWith('P') 
            ? message.participant 
            : `P${message.participant}`;
          nameMap[participantId] = message.participant;
        }
      }
    });
    
    return nameMap;
  }, [messages]);

  // Group messages simply
  const groupedMessages = useMemo(() => {
    if (messages.length === 0) return [];

    // Filter messages based on search and anonymous settings
    const filteredMessages = messages.filter(msg => {
      const matchesSearch = !searchTerm || msg.content.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAnonymous = showAnonymous || !msg.isAnonymous;
      return matchesSearch && matchesAnonymous;
    });

    // Simple grouping: user messages after assistant messages
    const groups = [];
    let currentGroup = { question: null, responses: [] };

    for (const message of filteredMessages) {
      if (message.sender === "assistant" && !message.isReport) {
        // Save previous group if it has responses
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
    
    // Add final group
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [messages, showAnonymous, searchTerm]);

  const totalResponses = groupedMessages.reduce((acc, group) => acc + group.responses.length, 0);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Simple search and filter bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnonymous(!showAnonymous)}
            className={`flex items-center gap-2 ${showAnonymous ? 'bg-blue-50 text-blue-700' : ''}`}
          >
            {showAnonymous ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showAnonymous ? 'Hide' : 'Show'} Anonymous
          </Button>
          
          <div className="text-sm text-gray-500">
            {totalResponses} responses from {currentParticipantCount} participants
          </div>
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        {groupedMessages.length > 0 ? (
          <ScrollArea className="h-full">
            <div className="space-y-6 p-4">
              {groupedMessages.map((group, groupIndex) => (
                <AdminMessageGroup
                  key={`group-${groupIndex}-${group.question.id}`}
                  group={group}
                  groupIndex={groupIndex}
                  participantColors={participantColors}
                  participantNameMap={participantNameMap}
                />
              ))}
            </div>
          </ScrollArea>
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

export default SimplifiedAdminMessagingView;
