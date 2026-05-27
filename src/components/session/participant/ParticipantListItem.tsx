/**
 * Participant List Item — Redesigned
 *
 * Shows per-participant engagement: message count badge,
 * activity status dot, and remove control on hover.
 */

import React from 'react';
import { ParticipantInfo } from "@/types/chat";
import { getParticipantColor } from "@/utils/sessionHelpers";
import { X, Crown, Loader2, Check } from "lucide-react";
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

  const responseLabel = `${messageCount} resp · ${activityLabel}`;
  const hasResponded = messageCount > 0;

  const displayName = participant.name || `Participant ${participant.id}`;

  return (
    <div className="group relative flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50 sm:px-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        {participant.isHost ? (
          <Avatar className="h-11 w-11">
            {participant.avatar && <AvatarImage src={participant.avatar} alt={displayName} />}
            <AvatarFallback className="bg-indigo-100 text-indigo-600">
              <Crown className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        ) : participant.avatar ? (
          <Avatar className="h-11 w-11">
            <AvatarImage src={participant.avatar} alt={displayName} />
            <AvatarFallback className="p-0 bg-transparent"><InlineAvatar name={displayName} size="lg" /></AvatarFallback>
          </Avatar>
        ) : (
          <InlineAvatar name={displayName} size="lg" />
        )}
        {/* Activity dot */}
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${activityDotClass}`} />
      </div>

      {/* Name + activity */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-slate-950 sm:text-base">
            {displayName}
          </span>
          {participant.isHost && (
            <span className="shrink-0 text-[10px] font-medium text-indigo-500">(Host)</span>
          )}
        </div>
        <span className="block truncate text-xs text-slate-500 sm:text-sm">{responseLabel}</span>
      </div>

      {/* Response status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${hasResponded ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-slate-50 text-slate-300'}`}>
              {hasResponded ? <Check className="h-4 w-4" /> : '·'}
            </span>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{hasResponded ? `${messageCount} response${messageCount !== 1 ? 's' : ''}` : 'No response yet'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Remove button */}
      {!participant.isHost && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full p-0 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                onClick={() => !isRemoving && onRemove(participant.id)}
                disabled={isRemoving}
              >
                {isRemoving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <X className="h-3.5 w-3.5" />
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
