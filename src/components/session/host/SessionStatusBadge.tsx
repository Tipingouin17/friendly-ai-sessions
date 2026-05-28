/**
 * Session Status Badge
 *
 * Session component for the AIfacilitator application.
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";

interface SessionStatusBadgeProps {
  isActive: boolean;
  sessionStarted: boolean;
  isWaitingRoomFull?: boolean;
  isSessionEnded?: boolean;
}

const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ 
  isActive, 
  sessionStarted,
  isWaitingRoomFull = false,
  isSessionEnded = false,
}) => {
  const getStatusInfo = () => {
    // Ended takes absolute priority over all other states
    if (isSessionEnded) {
      return {
        label: "Ended",
        variant: "outline" as const,
        color: "text-red-500"
      };
    }

    if (!sessionStarted) {
      if (isWaitingRoomFull) {
        return {
          label: "Ready",
          variant: "secondary" as const,
          color: "text-emerald-600"
        };
      }

      return {
        label: "Not Started",
        variant: "secondary" as const,
        color: "text-gray-500"
      };
    }
    
    if (isActive) {
      return {
        label: "Active",
        variant: "default" as const,
        color: "text-green-500"
      };
    }
    
    return {
      label: "Paused",
      variant: "outline" as const,
      color: "text-yellow-500"
    };
  };

  const status = getStatusInfo();

  return (
    <Badge variant={status.variant} className="flex items-center gap-1">
      <Circle className={`h-2 w-2 fill-current ${status.color}`} />
      {status.label}
    </Badge>
  );
};

export default SessionStatusBadge;
