/**
 * Facilitator Info
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface FacilitatorInfoProps {
  facilitatorName?: string;
  facilitatorAvatar?: string;
}

const FacilitatorInfo: React.FC<FacilitatorInfoProps> = ({
  facilitatorName,
  facilitatorAvatar
}) => {
  if (!facilitatorName) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-6 h-6">
        <AvatarImage src={facilitatorAvatar} alt={facilitatorName} />
        <AvatarFallback className="text-xs">
          {getInitials(facilitatorName)}
        </AvatarFallback>
      </Avatar>
      <span className="text-sm text-gray-600 font-medium">
        {facilitatorName}
      </span>
    </div>
  );
};

export default FacilitatorInfo;
