
import React, { useEffect, useState } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users, UserCheck, Award, Languages } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="font-medium text-primary">{facilitatorInfo.title}</p>
              <p className="text-sm text-gray-600 mt-1">{facilitatorInfo.details}</p>
              
              {facilitatorInfo.specialties && facilitatorInfo.specialties.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Award className="h-3 w-3" />
                    <span>Specialties:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {facilitatorInfo.specialties.map((specialty: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-100">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {facilitatorInfo.languages && facilitatorInfo.languages.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Languages className="h-3 w-3" />
                    <span>Languages:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {facilitatorInfo.languages.map((language: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-gray-100">
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
