/**
 * Admin Messaging View
 *
 * Session component for the AIfacilitator application.
 */

import React, { useMemo, useState } from 'react';
import { Message } from '@/types/chat';
import AdminMessageFilters from './AdminMessageFilters';
import AdminMessageGroup from './AdminMessageGroup';
import MessageEmptyState from './MessageEmptyState';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, MessageSquare, BarChart4, List } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'list' | 'compact'>('list');
  
  React.useEffect(() => { /* no-op */ }, [messages]);

  // Create a mapping of participant IDs to names
  const participantNameMap = useMemo(() => {
    const nameMap: { [key: string]: string } = { /* no-op */ };
    
    messages.forEach(message => {
      if (message.participant && typeof message.participant === 'string') {
        // participant is now a plain numeric string ID (e.g. "1", "2")
        // Only store if it looks like a name (contains non-numeric chars)
        if (isNaN(Number(message.participant)) && message.participant.includes(' ')) {
          nameMap[message.participant] = message.participant;
        }
      }
    });
    
    return nameMap;
  }, [messages]);

  const groupedMessages = useMemo(() => {

    if (messages.length > 0 && !messages.some(m => m.sender === "assistant")) {
      const userMessages = messages.filter(m => 
        m.sender === "user" && 
        (showAnonymous || !m.isAnonymous) &&
        (!searchTerm || m.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (userMessages.length > 0) {
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
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      } else if (message.sender === "user" && !currentGroup.question) {
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
        
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            currentGroup.responses.push(message);
          }
        }
      }
    }
    
    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }
    
    return groups;
  }, [messages, showAnonymous, searchTerm]);

  const totalResponses = groupedMessages.reduce((acc, group) => acc + group.responses.length, 0);
  
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
                messagesLength={messages.length}
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

export default AdminMessagingView;
