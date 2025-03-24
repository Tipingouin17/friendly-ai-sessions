
import React, { useMemo, useState, useCallback } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import AdminMessageFilters from './AdminMessageFilters';
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, MessageSquare, BarChart4, List } from 'lucide-react';

interface AdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount?: number;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  showAnonymous?: boolean;
  setShowAnonymous?: (show: boolean) => void;
  participants?: ParticipantInfo[]; // Add this prop to the interface
}

const AdminMessageView: React.FC<AdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount = 0,
  searchTerm = '',
  setSearchTerm = () => {},
  showAnonymous = true,
  setShowAnonymous = () => {},
  participants = []
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  
  // Deduplicate messages based on content and ID
  const deduplicatedMessages = useMemo(() => {
    const messageMap = new Map();
    let welcomeMessageAdded = false;
    
    // Process in order, giving preference to DB messages over local ones
    messages.forEach(msg => {
      // Handle non-welcome messages normally
      if (!msg.id.startsWith('welcome-')) {
        messageMap.set(msg.id, msg);
      } 
      // Special handling for welcome messages - only keep one
      else if (!welcomeMessageAdded) {
        messageMap.set('welcome', {
          ...msg,
          id: 'welcome' // Standardize welcome message ID
        });
        welcomeMessageAdded = true;
      }
    });
    
    return Array.from(messageMap.values());
  }, [messages]);

  // Create participant name mapping 
  const participantNameMap = useMemo(() => {
    const nameMap: { [key: string]: string } = {};
    
    deduplicatedMessages.forEach(message => {
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
  }, [deduplicatedMessages]);

  // Filter messages based on search and anonymity settings
  const filteredMessages = useMemo(() => {
    return deduplicatedMessages.filter(msg => {
      // Always include assistant messages
      if (msg.sender === 'assistant') return true;
      
      // Filter user messages based on settings
      return (showAnonymous || !msg.isAnonymous) &&
        (!searchTerm || msg.content.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [deduplicatedMessages, showAnonymous, searchTerm]);

  // Group messages into logical conversation threads
  const groupedMessages = useMemo(() => {
    if (filteredMessages.length === 0) return [];
    
    const groups = [];
    const welcomeMsg = filteredMessages.find(m => m.id === 'welcome');
    const facilitatorMsgs = filteredMessages.filter(m => 
      m.sender === 'assistant' && m.id !== 'welcome'
    );
    const userMsgs = filteredMessages.filter(m => m.sender === 'user');
    
    // If no facilitator messages besides welcome, create a single group
    if (facilitatorMsgs.length === 0 && userMsgs.length > 0) {
      return [{
        question: welcomeMsg || {
          id: 'default-question',
          content: 'Participant messages',
          sender: 'assistant',
          timestamp: new Date()
        },
        responses: userMsgs
      }];
    }
    
    // Process chronologically to group correctly
    const sortedMessages = [...filteredMessages].sort((a, b) => {
      const timeA = a.timestamp ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp ? b.timestamp.getTime() : 0;
      return timeA - timeB;
    });
    
    let currentGroup = {
      question: welcomeMsg || null,
      responses: [] as Message[]
    };
    
    // Group user messages under the most recent facilitator message
    for (const msg of sortedMessages) {
      if (msg.sender === 'assistant' && msg.id !== 'welcome') {
        // Save the previous group if it has responses
        if (currentGroup.question && currentGroup.responses.length > 0) {
          groups.push({...currentGroup});
        }
        
        // Start a new group with this facilitator message
        currentGroup = {
          question: msg,
          responses: []
        };
      } else if (msg.sender === 'user') {
        // Add user message to current group
        // If there's no question yet, create a default one
        if (!currentGroup.question) {
          currentGroup.question = welcomeMsg || {
            id: 'default-question',
            content: 'Participant messages',
            sender: 'assistant',
            timestamp: new Date()
          };
        }
        
        currentGroup.responses.push(msg);
      }
    }
    
    // Add the final group if it has responses
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [filteredMessages]);

  const totalResponses = useMemo(() => 
    groupedMessages.reduce((acc, group) => acc + group.responses.length, 0),
  [groupedMessages]);
  
  const uniqueParticipants = useMemo(() => {
    const participantSet = new Set();
    
    groupedMessages.forEach(group => {
      group.responses.forEach(response => {
        if (response.participant) {
          participantSet.add(response.participant);
        }
      });
    });
    
    return participantSet.size;
  }, [groupedMessages]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4">
        <Tabs defaultValue="questions" className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="questions" className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                Questions
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex items-center gap-1">
                <BarChart2 className="w-4 h-4" />
                Insights
              </TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <button 
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                className={`p-1.5 rounded ${viewMode === 'compact' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                onClick={() => setViewMode('compact')}
                aria-label="Compact view"
              >
                <BarChart4 className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <AdminMessageFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            showAnonymous={showAnonymous}
            setShowAnonymous={setShowAnonymous}
            totalResponses={totalResponses}
            currentParticipantCount={currentParticipantCount}
            totalQuestions={groupedMessages.length}
            uniqueParticipants={uniqueParticipants}
          />
          
          <TabsContent value="questions" className="m-0 mt-2">
            {groupedMessages.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className={`space-y-${viewMode === 'compact' ? '4' : '8'} p-1`}>
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
                messagesLength={deduplicatedMessages.length}
                viewMode="admin"
              />
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="m-0 mt-4">
            <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-lg font-medium text-gray-700 mb-2">Insights coming soon</p>
              <p className="text-gray-500">
                Visual analytics and insights for your session will be available here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminMessageView;
