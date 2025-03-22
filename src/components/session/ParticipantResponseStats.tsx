
import React from 'react';
import { Message } from '@/types/chat';
import { Progress } from '@/components/ui/progress';
import { Users, EyeOff, Clock, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  
  // Calculate response statistics
  const longestResponse = responses.reduce((longest, response) => 
    response.content.length > longest ? response.content.length : longest, 0);
    
  const shortestResponse = responses.length > 0 ? 
    responses.reduce((shortest, response) => 
      response.content.length < shortest ? response.content.length : shortest, 
      responses[0].content.length) : 0;
      
  const avgResponseLength = responses.length > 0 ?
    Math.round(responses.reduce((sum, response) => sum + response.content.length, 0) / responses.length) : 0;
  
  return (
    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {uniqueParticipants} of {totalParticipants} responded
          </span>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="bg-gray-100 px-2 py-0.5 rounded-lg text-sm font-medium">
                {responseRate}%
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Response rate</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {showDetailedStats && (
          <div className="flex flex-wrap gap-2 ml-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs flex items-center gap-1 bg-white">
                    <BarChart className="w-3 h-3" />
                    {avgResponseLength} chars avg
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Average response length: {avgResponseLength} characters</p>
                  <p>Shortest: {shortestResponse} | Longest: {longestResponse}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
      
      <Progress 
        value={responseRate} 
        className="h-2 bg-gray-200" 
      />
      
      <div className="mt-2 flex flex-wrap gap-2">
        {anonymousResponses > 0 && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <EyeOff className="w-3 h-3" />
            {anonymousResponses} anonymous
          </Badge>
        )}
        
        {averageResponseTime > 0 && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Avg. {averageResponseTime}s
          </Badge>
        )}
        
        {showDetailedStats && uniqueParticipants - anonymousResponses > 0 && (
          <Badge variant="outline" className="text-xs">
            {uniqueParticipants - anonymousResponses} named
          </Badge>
        )}
      </div>
    </div>
  );
};

export default ParticipantResponseStats;
