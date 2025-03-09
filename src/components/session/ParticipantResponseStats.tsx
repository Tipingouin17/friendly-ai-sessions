
import React from 'react';
import { Message } from '@/types/chat';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle2 } from 'lucide-react';

interface ParticipantResponseStatsProps {
  responses: Message[];
  totalParticipants: number;
}

const ParticipantResponseStats = ({ 
  responses, 
  totalParticipants 
}: ParticipantResponseStatsProps) => {
  // Calculate response rate
  const responseRate = totalParticipants > 0 ? Math.round((responses.length / totalParticipants) * 100) : 0;
  const responsesCount = responses.length;
  const remainingCount = totalParticipants - responsesCount;
  
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <div className="text-sm font-medium text-gray-700">Response Rate</div>
        </div>
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-primary">{responsesCount}</span>
          <span className="text-gray-500">of</span>
          <span className="font-medium text-gray-700">{totalParticipants}</span>
          <span className="text-gray-500">responded</span>
          <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full font-medium">{responseRate}%</span>
        </div>
      </div>
      
      <Progress value={responseRate} className="h-2" />
      
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        {responseRate === 100 ? (
          <div className="flex items-center gap-1 text-green-600 font-medium">
            <CheckCircle2 className="w-3 h-3" /> All participants responded
          </div>
        ) : (
          <div>Waiting for {remainingCount} more {remainingCount === 1 ? 'response' : 'responses'}</div>
        )}
        <div>{responseRate}% complete</div>
      </div>
    </div>
  );
};

export default ParticipantResponseStats;
