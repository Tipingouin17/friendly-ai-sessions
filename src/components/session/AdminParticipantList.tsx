
import React, { useEffect, useState } from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import { Users, Search } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import AdminMessageInput from "@/components/session/AdminMessageInput";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages?: Message[];
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData,
  messages = [],
  onSendMessage
}) => {
  const [participantsList, setParticipantsList] = useState<ParticipantInfo[]>(participants);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(isLoading);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Synchronize the component's local state with the incoming props
  useEffect(() => {
    if (participants && participants.length > 0) {
      console.log('AdminParticipantList: Updating participants list', participants.length);
      setParticipantsList(participants);
    }
    
    setIsLoadingParticipants(isLoading);
  }, [participants, isLoading]);
  
  const { 
    displayCount, 
    setDisplayCount, 
    removeParticipant,
    isRemoving
  } = useParticipantRemoval({
    conversationId: conversationData?.id || null,
    currentParticipantCount: participantsList.length,
    setParticipantsList
  });
  
  useEffect(() => {
    const actualCount = participantsList.length;
    console.log('AdminParticipantList: Setting display count to', actualCount);
    setDisplayCount(actualCount);
  }, [participantsList, setDisplayCount]);
  
  useParticipantRealtime({
    conversationId: conversationData?.id || null,
    participants: participantsList,
    setParticipants: setParticipantsList,
    setIsLoading: setIsLoadingParticipants,
    maxParticipants
  });
  
  const getParticipantMessageCount = (participantId: number) => {
    return messages.filter(msg => 
      msg.sender === 'user' && 
      msg.participant === `P${participantId}`
    ).length;
  };
  
  const getParticipantLastActive = (participantId: number) => {
    const participantMessages = messages.filter(msg => 
      msg.sender === 'user' && 
      msg.participant === `P${participantId}`
    );
    
    if (participantMessages.length === 0) return undefined;
    
    const lastMessage = participantMessages[participantMessages.length - 1];
    return lastMessage.timestamp || (lastMessage.created_at ? new Date(lastMessage.created_at) : undefined);
  };
  
  // Filter participants based on their actual name
  const filteredParticipants = participantsList.filter(participant => {
    const displayName = participant.name || `Participant ${participant.id}`;
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const actualParticipantCount = participantsList.length;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 font-semibold text-gray-900">
            <Users className="h-5 w-5" /> 
            Participants
          </h3>
          <Badge variant="outline" className="bg-white">
            {actualParticipantCount}/{maxParticipants || "∞"}
          </Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search participants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>
      
      {/* Participants List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {isLoadingParticipants ? (
            <ParticipantListSkeleton count={actualParticipantCount || 1} />
          ) : filteredParticipants.length > 0 ? (
            <div className="space-y-2">
              {filteredParticipants.map((participant) => (
                <ParticipantListItem
                  key={participant.id}
                  participant={participant}
                  onRemove={removeParticipant}
                  messageCount={getParticipantMessageCount(participant.id)}
                  lastActiveTime={getParticipantLastActive(participant.id)}
                  isRemoving={isRemoving === participant.id}
                />
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No participants found</p>
              <p className="text-xs text-gray-400">Try adjusting your search</p>
            </div>
          ) : (
            <EmptyParticipantList />
          )}
        </div>
      </div>

      {/* Admin Message Input */}
      {onSendMessage && (
        <div className="border-t border-gray-200">
          <AdminMessageInput
            onSendMessage={onSendMessage}
            participants={participantsList}
          />
        </div>
      )}
    </div>
  );
};

export default AdminParticipantList;
