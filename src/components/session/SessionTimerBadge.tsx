/**
 * SessionTimerBadge
 *
 * Compact countdown badge shown in the session header.
 * Changes colour as time runs down:
 *   > 10 min  → slate (neutral)
 *   ≤ 10 min  → amber (warning)
 *   ≤  2 min  → red   (urgent)
 *   expired   → red   (expired)
 */

import React from "react";
import { Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SessionTimerState } from "@/hooks/useSessionTimer";

interface SessionTimerBadgeProps {
  timer: SessionTimerState;
  /** If true, show the +5 / +10 min add-time buttons (host only) */
  showAddTime?: boolean;
}

const SessionTimerBadge: React.FC<SessionTimerBadgeProps> = ({
  timer,
  showAddTime = false,
}) => {
  const { formattedTime, isExpired, isWarning, isUrgent, addTime, isAddingTime } = timer;

  if (formattedTime === null) return null;

  const colourClass = isExpired || isUrgent
    ? "bg-red-50 text-red-700 border-red-200"
    : isWarning
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-slate-50 text-slate-600 border-slate-200";

  const iconClass = isExpired || isUrgent
    ? "text-red-500"
    : isWarning
    ? "text-amber-500"
    : "text-slate-400";

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-semibold ${colourClass} ${
          isUrgent ? "animate-pulse" : ""
        }`}
      >
        <Clock className={`h-3 w-3 ${iconClass}`} />
        {isExpired ? "Time's up" : formattedTime}
      </div>

      {showAddTime && !isExpired && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-slate-500 hover:text-indigo-700 hover:bg-indigo-50"
                disabled={isAddingTime}
                onClick={() => addTime(10)}
              >
                <Plus className="h-3 w-3" />
                10m
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add 10 minutes to the session</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-slate-500 hover:text-indigo-700 hover:bg-indigo-50"
                disabled={isAddingTime}
                onClick={() => addTime(5)}
              >
                <Plus className="h-3 w-3" />
                5m
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add 5 minutes to the session</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default SessionTimerBadge;
