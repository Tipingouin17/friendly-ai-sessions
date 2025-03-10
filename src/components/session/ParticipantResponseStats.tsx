
import React from 'react';
import { Message } from '@/types/chat';
import { Progress } from '@/components/ui/progress';
import { Users } from 'lucide-react';

interface ParticipantResponseStatsProps {
  responses: Message[];
  totalParticipants: number;
}

const ParticipantResponseStats: React.FC<ParticipantResponseStatsProps> = ({
  responses,
  totalParticipants
}) => {
  // Count unique participants who have responded
  const uniqueParticipants = new Set(
    responses.map(response => response.participant)
  ).size;
  
  // Calculate response rate percentage
  const responseRate = totalParticipants > 0 
    ? Math.round((uniqueParticipants / totalParticipants) * 100) 
    : 0;
  
  // Count anonymous responses
  const anonymousResponses = responses.filter(response => response.isAnonymous).length;
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {uniqueParticipants} of {totalParticipants} responded
          </span>
        </div>
        <span className="text-sm font-medium text-gray-700">{responseRate}%</span>
      </div>
      
      <Progress 
        value={responseRate} 
        className="h-2" 
      />
      
      {anonymousResponses > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          {anonymousResponses} anonymous {anonymousResponses === 1 ? 'response' : 'responses'}
        </div>
      )}
    </div>
  );
};

export default ParticipantResponseStats;
