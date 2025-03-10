
import React, { useEffect, useState } from 'react';
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { removeChannel } from "@/utils/realtimeHelpers";

interface ParticipantCounterProps {
  currentParticipants: number;
  maxParticipants: number;
}

const ParticipantCounter: React.FC<ParticipantCounterProps> = ({
  currentParticipants,
  maxParticipants
}) => {
  const [displayCount, setDisplayCount] = useState(currentParticipants);
  
  useEffect(() => {
    // Update from props when they change
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
