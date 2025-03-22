
import React, { useEffect } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";

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
  const [participantsList, setParticipantsList] = React.useState<ParticipantInfo[]>(participants);
  
  // Synchronize the component's local state with the incoming props
  useEffect(() => {
    if (participants && participants.length > 0) {
      setParticipantsList(participants);
    }
  }, [participants]);
  
  // Use custom hooks for participant management
  const { 
    displayCount, 
    setDisplayCount, 
    removeParticipant 
  } = useParticipantRemoval({
    conversationId: conversationData?.id || null,
    currentParticipantCount,
    setParticipantsList
  });
  
  // Set up realtime updates
  useParticipantRealtime({
    conversationId: conversationData?.id || null,
    participants: participantsList,
    maxParticipants,
    setDisplayCount,
    setParticipantsList
  });

  return (
    <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-white hidden md:block">
      <h3 className="flex items-center gap-2 font-medium mb-4 text-gray-900">
        <Users className="h-5 w-5" /> 
        Participants ({displayCount}/{maxParticipants || "∞"})
      </h3>
      
      {isLoading ? (
        <ParticipantListSkeleton count={displayCount} />
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
    </div>
  );
};

export default AdminParticipantList;
