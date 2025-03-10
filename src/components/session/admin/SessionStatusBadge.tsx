
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface SessionStatusBadgeProps {
  isActive: boolean;
}

const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ isActive }) => {
  return (
    <Badge 
      variant={isActive ? "default" : "secondary"}
      className={`ml-2 ${isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
    >
      {isActive ? "Active" : "Paused"}
    </Badge>
  );
};

export default SessionStatusBadge;
