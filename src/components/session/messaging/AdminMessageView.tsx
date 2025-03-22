
import React, { useMemo, useState, useEffect } from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'questions' | 'responses'>('all');
  
  // Debug log messages for debugging
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

  // Filter groups based on search term and filter type
  const filteredGroups = useMemo(() => {
    if (!searchTerm && filterType === 'all') {
      return groupedMessages;
    }
    
    return groupedMessages.filter(group => {
      // Filter by question content
      const questionMatches = 
        (filterType === 'all' || filterType === 'questions') && 
        group.question.content.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by response content
      const responseMatches = 
        (filterType === 'all' || filterType === 'responses') && 
        group.responses.some(response => 
          response.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (typeof response.participant === 'string' && 
           response.participant.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        
      return questionMatches || responseMatches;
    });
  }, [groupedMessages, searchTerm, filterType]);

  // Get total participants and responses for all groups
  const totalStats = useMemo(() => {
    let totalParticipants = 0;
    let totalResponses = 0;
    
    groupedMessages.forEach(group => {
      // Count unique participants in this group
      const uniqueParticipants = new Set(
        group.responses.map(response => response.participant)
      );
      
      totalParticipants = Math.max(totalParticipants, uniqueParticipants.size);
      totalResponses += group.responses.length;
    });
    
    return { totalParticipants, totalResponses };
  }, [groupedMessages]);

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
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search all questions and responses..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Select 
              value={filterType} 
              onValueChange={(value) => setFilterType(value as 'all' | 'questions' | 'responses')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All content</SelectItem>
                <SelectItem value="questions">Questions only</SelectItem>
                <SelectItem value="responses">Responses only</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-500">
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {filteredGroups.length} question{filteredGroups.length !== 1 ? 's' : ''}
          </span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {totalStats.totalResponses} response{totalStats.totalResponses !== 1 ? 's' : ''}
          </span>
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {totalStats.totalParticipants} participant{totalStats.totalParticipants !== 1 ? 's' : ''}
          </span>
          
          {searchTerm && (
            <span className="ml-auto">
              Showing results for "{searchTerm}" 
              <button 
                className="ml-2 text-primary underline"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            </span>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-6">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group, groupIndex) => (
              <AdminMessageGroup
                key={`group-${groupIndex}-${group.question.id}`}
                group={group}
                groupIndex={groupIndex}
                participantColors={participantColors}
              />
            ))
          ) : (
            <div className="text-center p-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-lg font-medium mb-2">No matching results</p>
              <p>Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AdminMessageView;
