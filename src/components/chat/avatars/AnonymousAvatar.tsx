/**
 * Anonymous Avatar
 *
 * Chat component for the AIfacilitator application.
 */

import React from 'react';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EyeOff } from 'lucide-react';

interface AnonymousAvatarProps {
  size?: 'sm' | 'md' | 'lg';
}

const AnonymousAvatar = ({ size = 'md' }: AnonymousAvatarProps) => {
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  return (
    <Avatar className={`${dimensions[size]} bg-gray-100 avatar-container`}>
      <AvatarFallback className="bg-gray-100 text-gray-500">
        <EyeOff className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
};

export default AnonymousAvatar;
