
import React, { useEffect, useState } from 'react';
import { Users } from "lucide-react";
import { useSimplifiedParticipantMonitoring } from "@/hooks/useSimplifiedParticipantMonitoring";

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
  
  // Update from props when they change
  useEffect(() => {
    console.log('Admin ParticipantCounter: Updating display count to', currentParticipants);
    setDisplayCount(currentParticipants);
  }, [currentParticipants]);
  
  // Use simplified monitoring for realtime updates
  useSimplifiedParticipantMonitoring({
    conversationId,
    onParticipantCountChange: (count) => {
      console.log(`Admin ParticipantCounter: Setting display count to ${count}`);
      setDisplayCount(count);
    },
    enabled: !!conversationId
  });
  
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
