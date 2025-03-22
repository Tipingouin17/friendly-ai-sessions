
import React, { useEffect, useState } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users, UserCheck, Award, Languages, Clock, BookText, BadgeCheck } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData
}) => {
  const [participantsList, setParticipantsList] = useState<ParticipantInfo[]>(participants);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(isLoading);
  
  // Synchronize the component's local state with the incoming props
  useEffect(() => {
    if (participants && participants.length > 0) {
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
    currentParticipantCount: participantsList.length, // Use actual list length instead of passed count
    setParticipantsList
  });
  
  // Update display count whenever the participants list changes
  useEffect(() => {
    setDisplayCount(participantsList.length);
  }, [participantsList, setDisplayCount]);
  
  // Set up realtime updates with the updated hook
  useParticipantRealtime({
    conversationId: conversationData?.id || null,
    participants: participantsList,
    setParticipants: setParticipantsList,
    setIsLoading: setIsLoadingParticipants,
    maxParticipants
  });
  
  // Get the facilitator information from the conversation data
  const facilitatorInfo = conversationData?.sessions?.facilitator_details || null;
  const sessionInfo = conversationData?.sessions || null;

  return (
    <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-white hidden md:block">
      <h3 className="flex items-center gap-2 font-medium mb-4 text-gray-900">
        <Users className="h-5 w-5" /> 
        Participants ({participantsList.length}/{maxParticipants || "∞"})
      </h3>
      
      {isLoadingParticipants ? (
        <ParticipantListSkeleton count={participantsList.length || 1} />
      ) : participantsList.length > 0 ? (
        <div className="space-y-2">
          {participantsList.map((participant) => (
            <ParticipantListItem
              key={participant.id}
              participant={participant}
              onRemove={removeParticipant}
            />
          ))}
        </div>
      ) : (
        <EmptyParticipantList />
      )}
      
      {facilitatorInfo && (
        <>
          <Separator className="my-4" />
          <div className="mt-4">
            <h4 className="flex items-center gap-2 font-medium mb-2 text-gray-900">
              <UserCheck className="h-5 w-5" />
              Facilitator
            </h4>
            <div className="bg-gray-50 p-4 rounded-md shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-primary text-lg">{facilitatorInfo.title}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="bg-primary/10 text-xs">
                        {facilitatorInfo.expertise_level || "Expert"}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Facilitator expertise level</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <p className="text-sm text-gray-600 mt-2">{facilitatorInfo.details}</p>
              
              {sessionInfo?.duration_minutes && (
                <div className="flex items-center gap-1 mt-4 text-xs text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Duration: {sessionInfo.duration_minutes} minutes</span>
                </div>
              )}
              
              {sessionInfo?.session_type && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <BookText className="h-3.5 w-3.5" />
                  <span>Type: {sessionInfo.session_type.replace('_', ' ')}</span>
                </div>
              )}
              
              {sessionInfo?.skill_level && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  <span>Level: {sessionInfo.skill_level}</span>
                </div>
              )}
              
              {facilitatorInfo.specialties && facilitatorInfo.specialties.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Award className="h-3.5 w-3.5" />
                    <span>Specialties:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {facilitatorInfo.specialties.map((specialty: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-100 text-gray-700">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {facilitatorInfo.languages && facilitatorInfo.languages.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Languages className="h-3.5 w-3.5" />
                    <span>Languages:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {facilitatorInfo.languages.map((language: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-100 text-gray-700">
                        {language}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminParticipantList;
