
import React, { useEffect, useState } from 'react';
import { ParticipantInfo, Message } from "@/types/chat";
import { Users, UserCheck, Award, Languages, Clock, BookText, BadgeCheck, Sparkles, GraduationCap, Search } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  messages?: Message[];
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData,
  messages = []
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
  
  // Use custom hooks for participant management
  const { 
    displayCount, 
    setDisplayCount, 
    removeParticipant 
  } = useParticipantRemoval({
    conversationId: conversationData?.id || null,
    currentParticipantCount: participantsList.length,
    setParticipantsList
  });
  
  // Update display count whenever the participants list changes
  useEffect(() => {
    const actualCount = participantsList.length;
    console.log('AdminParticipantList: Setting display count to', actualCount);
    setDisplayCount(actualCount);
  }, [participantsList, setDisplayCount]);
  
  // Set up realtime updates with the updated hook
  useParticipantRealtime({
    conversationId: conversationData?.id || null,
    participants: participantsList,
    setParticipants: setParticipantsList,
    setIsLoading: setIsLoadingParticipants,
    maxParticipants
  });
  
  // Calculate message counts for each participant
  const getParticipantMessageCount = (participantId: number) => {
    return messages.filter(msg => 
      msg.sender === 'user' && 
      msg.participant === `P${participantId}`
    ).length;
  };
  
  // Get last active time for participant
  const getParticipantLastActive = (participantId: number) => {
    const participantMessages = messages.filter(msg => 
      msg.sender === 'user' && 
      msg.participant === `P${participantId}`
    );
    
    if (participantMessages.length === 0) return undefined;
    
    const lastMessage = participantMessages[participantMessages.length - 1];
    return lastMessage.timestamp || (lastMessage.created_at ? new Date(lastMessage.created_at) : undefined);
  };
  
  // Filter participants based on search term
  const filteredParticipants = participantsList.filter(participant => 
    participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `Participant ${participant.id}`.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get the facilitator information from the conversation data
  const facilitatorInfo = conversationData?.sessions?.facilitator_details || null;
  const sessionInfo = conversationData?.sessions || null;

  // Use actual participant count instead of passed count for display
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
            <div className="space-y-3">
              {filteredParticipants.map((participant) => (
                <ParticipantListItem
                  key={participant.id}
                  participant={participant}
                  onRemove={removeParticipant}
                  messageCount={getParticipantMessageCount(participant.id)}
                  lastActiveTime={getParticipantLastActive(participant.id)}
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
      
      {/* Facilitator Info */}
      {facilitatorInfo && (
        <>
          <Separator />
          <div className="p-4 bg-gray-50">
            <h4 className="flex items-center gap-2 font-semibold mb-3 text-gray-900">
              <UserCheck className="h-5 w-5" />
              Facilitator
            </h4>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold text-primary text-lg">{facilitatorInfo.title}</p>
                  {facilitatorInfo.details && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{facilitatorInfo.details}</p>
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="bg-primary/10 text-xs whitespace-nowrap">
                        Expert
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Facilitator expertise level</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <div className="space-y-2 text-xs text-gray-500">
                {sessionInfo?.duration_minutes && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Duration: {sessionInfo.duration_minutes} minutes</span>
                  </div>
                )}
                
                {sessionInfo?.session_type && (
                  <div className="flex items-center gap-2">
                    <BookText className="h-3.5 w-3.5" />
                    <span>Type: {sessionInfo.session_type.replace('_', ' ')}</span>
                  </div>
                )}
                
                {sessionInfo?.skill_level && (
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    <span>Level: {sessionInfo.skill_level}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminParticipantList;
