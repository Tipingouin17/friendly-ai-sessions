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
}

const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ 
  isActive, 
  sessionStarted 
}) => {
  const getStatusInfo = () => {
    if (!sessionStarted) {
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
