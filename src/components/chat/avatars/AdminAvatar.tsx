
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}

const AdminAvatar = ({ size = 'md', name = 'Admin' }: AdminAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10', 
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Avatar className={cn(sizeClasses[size], "ring-2 ring-blue-200")}>
      <AvatarImage src="" alt={name} />
      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
        <UserCog className={iconSizes[size]} />
      </AvatarFallback>
    </Avatar>
  );
};

export default AdminAvatar;
