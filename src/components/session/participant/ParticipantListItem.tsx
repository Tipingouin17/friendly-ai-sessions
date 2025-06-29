
import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { X, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ParticipantListItemProps {
  participant: ParticipantInfo;
  onRemove: (participantId: number) => void;
  messageCount?: number;
  lastActiveTime?: Date;
  isRemoving?: boolean;
}

const ParticipantListItem: React.FC<ParticipantListItemProps> = ({
  participant,
  onRemove,
  messageCount = 0,
  lastActiveTime,
  isRemoving = false
}) => {
  const participantColor = getParticipantColor(`P${participant.id}`);
  
  // Calculate time since last active in minutes
  const minutesSinceActive = lastActiveTime 
    ? Math.round((new Date().getTime() - lastActiveTime.getTime()) / (1000 * 60))
    : null;
  
  // Determine engagement level based on message count
  const getEngagementColor = () => {
    if (messageCount === 0) return "bg-gray-300";
    if (messageCount < 3) return "bg-amber-400";
    if (messageCount < 7) return "bg-blue-400";
    return "bg-green-400";
  };
  
  // Activity indicator color
  const getActivityColor = () => {
    if (!minutesSinceActive) return "bg-gray-300";
    if (minutesSinceActive < 2) return "bg-green-400";
    if (minutesSinceActive < 5) return "bg-amber-400";
    if (minutesSinceActive < 15) return "bg-orange-400";
    return "bg-gray-400";
  };
  
  // Always display the participant's actual name from the database
  const displayName = participant.name || `Participant ${participant.id}`;

  const handleRemove = () => {
    if (!isRemoving) {
      onRemove(participant.id);
    }
  };

  return (
    <div className="group flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar with engagement indicator */}
        <div className="relative">
          <Avatar className="h-9 w-9 border-2" style={{ borderColor: `${participantColor}30` }}>
            <AvatarImage src={participant.avatar} alt={displayName} />
            <AvatarFallback 
              className="text-white font-medium text-sm"
              style={{ backgroundColor: participantColor }}
            >
              {participant.isHost ? (
                <Crown className="h-4 w-4" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Engagement indicator - small dot */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${getEngagementColor()}`}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{messageCount} messages</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Participant Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm font-medium text-gray-900 truncate">
                  {displayName}
                  {participant.isHost && (
                    <span className="ml-1 text-xs text-amber-600">(Host)</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{displayName}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Activity indicator */}
          {minutesSinceActive !== null && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <div className={`w-1.5 h-1.5 rounded-full ${getActivityColor()}`}></div>
              <span>
                {minutesSinceActive < 1 ? 'Active now' : 
                 minutesSinceActive < 60 ? `${minutesSinceActive}m ago` : 
                 `${Math.round(minutesSinceActive / 60)}h ago`}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Remove button - only show for non-host participants */}
      {!participant.isHost && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isRemoving ? 'Removing...' : 'Remove participant'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default ParticipantListItem;
