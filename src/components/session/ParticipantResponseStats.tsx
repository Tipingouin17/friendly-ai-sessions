
import React from 'react';
import { Message } from '@/types/chat';
import { Progress } from '@/components/ui/progress';
import { Users, EyeOff, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ParticipantResponseStatsProps {
  responses: Message[];
  totalParticipants: number;
  showDetailedStats?: boolean;
}

const ParticipantResponseStats: React.FC<ParticipantResponseStatsProps> = ({
  responses,
  totalParticipants,
  showDetailedStats = false
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
  
  // Calculate average response time if timestamps are available
  const responseTimes = responses
    .filter(response => response.timestamp)
    .map(response => response.timestamp!.getTime());
  
  const averageResponseTime = responseTimes.length > 0
    ? Math.round((Math.max(...responseTimes) - Math.min(...responseTimes)) / responseTimes.length / 1000)
    : 0;
  
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
      
      <div className="mt-2 flex flex-wrap gap-2">
        {anonymousResponses > 0 && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            {anonymousResponses} anonymous
          </Badge>
        )}
        
        {averageResponseTime > 0 && showDetailedStats && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Avg. {averageResponseTime}s
          </Badge>
        )}
        
        {showDetailedStats && (
          <Badge variant="outline" className="text-xs">
            {uniqueParticipants} named
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ParticipantResponseStats;
