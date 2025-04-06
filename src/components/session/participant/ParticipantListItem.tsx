
import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { X, MessageSquare, Clock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ParticipantListItemProps {
  participant: ParticipantInfo;
  onRemove: (participantId: number) => void;
  messageCount?: number;
  lastActiveTime?: Date;
}

const ParticipantListItem: React.FC<ParticipantListItemProps> = ({
  participant,
  onRemove,
  messageCount = 0,
  lastActiveTime
}) => {
  const participantColor = getParticipantColor(`P${participant.id}`);
  
  // Calculate time since last active in minutes
  const minutesSinceActive = lastActiveTime 
    ? Math.round((new Date().getTime() - lastActiveTime.getTime()) / (1000 * 60))
    : null;
  
  // Determine engagement level based on message count
  const getEngagementLevel = () => {
    if (messageCount === 0) return "none";
    if (messageCount < 3) return "low";
    if (messageCount < 7) return "medium";
    return "high";
  };
  
  const engagementLevel = getEngagementLevel();
  const engagementColors: {[key: string]: string} = {
    none: "bg-gray-100 text-gray-500",
    low: "bg-blue-50 text-blue-600",
    medium: "bg-amber-50 text-amber-600",
    high: "bg-green-50 text-green-600"
  };
  
  // Activity indicator - more prominent color for recently active users
  const getActivityIndicatorColor = () => {
    if (!minutesSinceActive) return "bg-gray-300";
    if (minutesSinceActive < 2) return "bg-green-400";
    if (minutesSinceActive < 5) return "bg-amber-400";
    return "bg-gray-300";
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${participantColor}30` }}>
          <span className="text-xs font-medium" style={{ color: participantColor }}>{participant.id}</span>
        </div>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-gray-800 truncate max-w-[120px]">
              {participant.name || `Participant ${participant.id}`}
            </span>
            <div className={`h-2 w-2 rounded-full ${getActivityIndicatorColor()}`}></div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {participant.isAnonymous && <Badge variant="outline" className="text-[10px] h-4 px-1">Anonymous</Badge>}
            
            {messageCount > 0 && (
              <div className="flex items-center gap-0.5">
                <MessageSquare className="h-3 w-3" />
                <span>{messageCount}</span>
              </div>
            )}
            
            {minutesSinceActive && (
              <div className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" />
                <span>{minutesSinceActive}m</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Badge variant="outline" className={`${engagementColors[engagementLevel]} text-xs py-0 px-1.5`}>
          {engagementLevel !== "none" ? `${engagementLevel} engagement` : "no engagement"}
        </Badge>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-500"
                onClick={() => onRemove(participant.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Remove participant</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ParticipantListItem;
