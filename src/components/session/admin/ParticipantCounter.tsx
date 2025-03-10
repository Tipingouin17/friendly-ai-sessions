
import React from 'react';
import { Users } from "lucide-react";

interface ParticipantCounterProps {
  currentParticipants: number;
  maxParticipants: number;
}

const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  currentParticipants,
  maxParticipants
}) => {
  return (
    <div className="flex items-center mr-4 bg-gray-50 px-3 py-1 rounded-full">
      <Users size={16} className="text-gray-500 mr-1" />
      <span className="text-sm font-medium">
        {currentParticipants}/{maxParticipants}
      </span>
    </div>
  );
};

export default ParticipantCounter;
