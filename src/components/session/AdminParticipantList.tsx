
import React, { useEffect, useState } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users } from "lucide-react";
import { useParticipantRemoval } from "@/hooks/useParticipantRemoval";
import { useParticipantRealtime } from "@/hooks/useParticipantRealtime";
import ParticipantListItem from "@/components/session/participant/ParticipantListItem";
import EmptyParticipantList from "@/components/session/participant/EmptyParticipantList";
import ParticipantListSkeleton from "@/components/session/participant/ParticipantListSkeleton";
import AdminMessageInput from "@/components/session/AdminMessageInput";

interface AdminParticipantListProps {
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  isLoading: boolean;
  conversationData: any;
  onSendAdminMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
}

const AdminParticipantList: React.FC<AdminParticipantListProps> = ({
  participants,
  currentParticipantCount,
  maxParticipants,
  isLoading,
  conversationData,
  onSendAdminMessage
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

  // Handle sending admin messages
  const handleSendMessage = (message: string, isPinned: boolean, recipientId?: string) => {
    if (onSendAdminMessage) {
      onSendAdminMessage(message, isPinned, recipientId);
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white hidden md:block flex flex-col h-full">
      <div className="p-4 overflow-y-auto flex-1">
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
      </div>
      
      {/* Admin message input at the bottom */}
      {onSendAdminMessage && (
        <AdminMessageInput 
          onSendMessage={handleSendMessage}
          participants={participantsList}
        />
      )}
    </div>
  );
};

export default AdminParticipantList;
