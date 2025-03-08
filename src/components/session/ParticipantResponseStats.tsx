
import React from 'react';
import { Message } from '@/types/chat';
import { Progress } from '@/components/ui/progress';

interface ParticipantResponseStatsProps {
  responses: Message[];
  totalParticipants: number;
}

const ParticipantResponseStats = ({ 
  responses, 
  totalParticipants 
}: ParticipantResponseStatsProps) => {
  // Calculate response rate
  const responseRate = (responses.length / totalParticipants) * 100;
  
  return (
    <div className="bg-white p-4 border-b border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">Participant Responses</div>
        <div className="text-sm text-gray-500">
          {responses.length} of {totalParticipants} responded
        </div>
      </div>
      
      <Progress value={responseRate} className="h-2" />
    </div>
  );
};

export default ParticipantResponseStats;
