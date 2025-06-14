
import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { X, MessageSquare, Clock, User, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  
  // Determine engagement level based on message count and activity
  const getEngagementLevel = () => {
    if (messageCount === 0) return { level: "inactive", color: "bg-gray-100 text-gray-600", label: "No activity" };
    if (messageCount < 3) return { level: "low", color: "bg-amber-50 text-amber-700", label: "Low engagement" };
    if (messageCount < 7) return { level: "medium", color: "bg-blue-50 text-blue-700", label: "Active" };
    return { level: "high", color: "bg-green-50 text-green-700", label: "Highly engaged" };
  };
  
  const engagement = getEngagementLevel();
  
  // Activity indicator - more prominent color for recently active users
  const getActivityStatus = () => {
    if (!minutesSinceActive) return { color: "bg-gray-300", status: "Unknown" };
    if (minutesSinceActive < 2) return { color: "bg-green-400", status: "Online" };
    if (minutesSinceActive < 5) return { color: "bg-amber-400", status: "Recently active" };
    if (minutesSinceActive < 15) return { color: "bg-orange-400", status: "Away" };
    return { color: "bg-gray-400", status: "Inactive" };
  };
  
  const activityStatus = getActivityStatus();
  
  // Get display name with fallback
  const getDisplayName = () => {
    if (participant.name && participant.name !== `Participant ${participant.id}`) {
      return participant.name;
    }
    return `Guest ${participant.id}`;
  };

  const displayName = getDisplayName();
  const isDefaultName = participant.name === `Participant ${participant.id}` || !participant.name;

  return (
    <div className="group flex items-center justify-between p-4 rounded-lg border border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all duration-200 shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-10 w-10 border-2" style={{ borderColor: `${participantColor}30` }}>
            <AvatarImage src={participant.avatar} alt={displayName} />
            <AvatarFallback 
              className="text-white font-medium text-sm"
              style={{ backgroundColor: participantColor }}
            >
              {participant.isAdmin ? (
                <Crown className="h-4 w-4" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          {/* Activity indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${activityStatus.color}`}
                ></div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{activityStatus.status}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Participant Info */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`font-medium text-gray-900 truncate max-w-[140px] ${isDefaultName ? 'italic text-gray-600' : ''}`}>
                    {displayName}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{displayName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {participant.isAdmin && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-purple-50 text-purple-700 border-purple-200">
                Admin
              </Badge>
            )}
            
            {participant.isAnonymous && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-gray-50 text-gray-600">
                Anonymous
              </Badge>
            )}
          </div>
          
          {/* Stats Row */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {messageCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{messageCount} messages</span>
              </div>
            )}
            
            {minutesSinceActive !== null && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {minutesSinceActive < 1 ? 'Just now' : 
                   minutesSinceActive < 60 ? `${minutesSinceActive}m ago` : 
                   `${Math.round(minutesSinceActive / 60)}h ago`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Right Section - Engagement & Actions */}
      <div className="flex items-center gap-2 ml-2">
        <Badge variant="outline" className={`${engagement.color} text-xs py-0.5 px-2 font-medium`}>
          {engagement.label}
        </Badge>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 rounded-full hover:bg-red-50 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
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
