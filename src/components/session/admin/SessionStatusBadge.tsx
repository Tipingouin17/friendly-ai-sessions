/**
 * Session Status Badge
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SessionStatusBadgeProps {
  isActive: boolean;
  sessionStarted?: boolean;
}

const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ isActive, sessionStarted = false }) => {
  return (
    <Badge 
      variant={isActive ? "success" : "secondary"}
      className={`ml-2 ${isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
    >
      {isActive ? "Active" : "Paused"}
    </Badge>
  );
};

export default SessionStatusBadge;
