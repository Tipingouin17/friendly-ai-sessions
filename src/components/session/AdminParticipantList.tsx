
import React, { useEffect } from 'react';
import { ParticipantInfo } from "@/types/chat";
import { Users } from "lucide-react";

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
  // Log participant information for debugging
  useEffect(() => {
    console.log("AdminParticipantList rendering with:", { 
      participants: participants.length,
      currentParticipantCount,
      maxParticipants,
      conversationDataParticipants: conversationData?.current_participants
    });
  }, [participants.length, currentParticipantCount, maxParticipants, conversationData]);

  // Use the higher count between participants array length and currentParticipantCount
  const displayParticipantCount = Math.max(participants.length, currentParticipantCount);

  return (
    <div className="w-80 border-l border-gray-200 p-4 overflow-y-auto bg-gray-50 hidden md:block">
      <h3 className="font-medium mb-2 flex items-center gap-2">
        <Users className="h-4 w-4" /> 
        Participants ({displayParticipantCount}/{maxParticipants || "∞"})
      </h3>
      
      {isLoading ? (
        <div className="text-center py-4 text-sm text-gray-500">
          Loading participants...
        </div>
      ) : participants.length > 0 ? (
        <div className="space-y-2">
          {participants.map(participant => (
            <div 
              key={`participant-${participant.id}`}
              className="p-2 bg-white rounded border border-gray-100 flex items-center gap-2"
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: ['#FCA5A5', '#FDBA74', '#BEF264'][participant.id % 3] }} 
              />
              <div className="flex-1">
                <div className="text-sm font-medium">{participant.name}</div>
                {participant.isAnonymous && (
                  <div className="text-xs text-gray-500">Anonymous mode</div>
                )}
              </div>
              <div className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                Active
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-sm text-gray-500">
          No participants have joined yet.
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>Session: {conversationData?.sessions?.title || "Unknown"}</p>
        <p>Objective: {conversationData?.sessions?.objective || "Not specified"}</p>
        <p>Max participants: {conversationData?.participants || "Unlimited"}</p>
        <p>Current participants: {conversationData?.current_participants || 0}</p>
        <p>Language: {conversationData?.language || "Not specified"}</p>
        <p>Session started: {conversationData?.session_started ? "Yes" : "No"}</p>
      </div>
    </div>
  );
};

export default AdminParticipantList;
