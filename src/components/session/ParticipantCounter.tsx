/**
 * Participant Counter
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from 'react';
import { Users } from "lucide-react";

interface ParticipantCounterProps {
  currentParticipants: number;
  maxParticipants: number;
  conversationId?: number | null;
}

const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  currentParticipants,
  maxParticipants,
  conversationId
}) => {
  const [displayCount, setDisplayCount] = useState(currentParticipants);
  
  // Update from props when they change - rely on parent state management
  useEffect(() => {
    setDisplayCount(currentParticipants);
  }, [currentParticipants]);
  
  return (
    <div className="flex items-center mr-4 bg-gray-50 px-3 py-1 rounded-full">
      <Users size={16} className="text-gray-500 mr-1" />
      <span className="text-sm font-medium">
        {displayCount}/{maxParticipants}
      </span>
    </div>
  );
};

export default ParticipantCounter;
