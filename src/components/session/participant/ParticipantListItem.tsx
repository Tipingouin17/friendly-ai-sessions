/**
 * Participant List Item — Redesigned
 *
 * Shows per-participant engagement: message count badge,
 * activity status dot, and remove control on hover.
 */

import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { X, Crown, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InlineAvatar from '@/components/chat/avatars/InlineAvatar';

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
  const participantColor = getParticipantColor(String(participant.id));

  const minutesSinceActive = lastActiveTime
    ? Math.round((new Date().getTime() - lastActiveTime.getTime()) / (1000 * 60))
    : null;

  // Activity dot: green = just active, amber = few mins, slate = idle
  const activityDotClass = (() => {
    if (minutesSinceActive === null) return 'bg-slate-300';
    if (minutesSinceActive < 2) return 'bg-emerald-400';
    if (minutesSinceActive < 10) return 'bg-amber-400';
    return 'bg-slate-300';
  })();

  const activityLabel = (() => {
    if (minutesSinceActive === null) return 'No activity yet';
    if (minutesSinceActive < 1) return 'Active now';
    if (minutesSinceActive < 60) return `${minutesSinceActive}m ago`;
    return `${Math.round(minutesSinceActive / 60)}h ago`;
  })();

  // Engagement level colour for message count badge
  const engagementBadgeClass = (() => {
    if (messageCount === 0) return 'bg-slate-100 text-slate-400';
    if (messageCount < 3) return 'bg-indigo-100 text-indigo-600';
    if (messageCount < 7) return 'bg-violet-100 text-violet-600';
    return 'bg-emerald-100 text-emerald-700';
  })();

  const displayName = participant.name || `Participant ${participant.id}`;

  return (
    <div className="group flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
      {/* Avatar */}
      <div className="relative shrink-0">
        {participant.isHost ? (
          <Avatar className="h-8 w-8">
            {participant.avatar && <AvatarImage src={participant.avatar} alt={displayName} />}
            <AvatarFallback className="bg-indigo-100 text-indigo-600">
              <Crown className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
        ) : participant.avatar ? (
          <Avatar className="h-8 w-8">
            <AvatarImage src={participant.avatar} alt={displayName} />
            <AvatarFallback><InlineAvatar name={displayName} size="md" /></AvatarFallback>
          </Avatar>
        ) : (
          <InlineAvatar name={displayName} size="md" />
        )}
        {/* Activity dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${activityDotClass}`} />
      </div>

      {/* Name + activity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-800 truncate">
            {displayName}
          </span>
          {participant.isHost && (
            <span className="text-[10px] text-indigo-500 font-medium shrink-0">(Host)</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400">{activityLabel}</span>
      </div>

      {/* Message count badge */}
      {messageCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${engagementBadgeClass}`}>
                <MessageSquare className="h-2.5 w-2.5" />
                {messageCount}
              </span>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{messageCount} message{messageCount !== 1 ? 's' : ''} sent</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Remove button */}
      {!participant.isHost && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 rounded-full hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={() => !isRemoving && onRemove(participant.id)}
                disabled={isRemoving}
              >
                {isRemoving
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <X className="h-3 w-3" />
                }
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{isRemoving ? 'Removing…' : 'Remove participant'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default ParticipantListItem;
