
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, EyeOff, Bot } from 'lucide-react';
import BoringAvatar from 'boring-avatars';

interface MessageAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  anonymized?: boolean;
  isAssistant?: boolean;
}

const MessageAvatar = ({ 
  avatarUrl, 
  name, 
  size = 'md',
  anonymized = false,
  isAssistant = false
}: MessageAvatarProps) => {
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // For anonymized avatars, show a special avatar
  if (anonymized) {
    return (
      <Avatar className={`${dimensions[size]} bg-gray-100 avatar-container`}>
        <AvatarFallback className="bg-gray-100 text-gray-500">
          <EyeOff className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // For assistant/facilitator avatars, show a special icon if no avatar
  if (isAssistant && (!avatarUrl || avatarUrl === '' || avatarUrl === '/placeholder.svg')) {
    return (
      <Avatar className={`${dimensions[size]} bg-blue-100 avatar-container`}>
        <AvatarFallback className="bg-blue-100 text-blue-500">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Define avatar palettes
  const AVATAR_PALETTES = [
    ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
    ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
    ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
    ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
    ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
  ];

  // Always generate an avatar for users with no specific avatar
  if (!avatarUrl || avatarUrl === '') {
    // Use name as avatar seed
    const avatarName = name || 'User';
    const paletteIndex = Math.abs(avatarName.charCodeAt(0) % AVATAR_PALETTES.length);
    
    return (
      <div className={`overflow-hidden rounded-full ${dimensions[size]} avatar-container`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <BoringAvatar
          size={size === 'sm' ? 28 : size === 'md' ? 32 : 40}
          name={avatarName}
          variant="beam"
          colors={AVATAR_PALETTES[paletteIndex]}
          square={false}
        />
      </div>
    );
  }

  // Handle existing avatar URLs
  if (avatarUrl?.startsWith('/api/avatar') || avatarUrl?.includes('api.qrserver.com')) {
    // Use name as avatar seed if it's an API avatar
    const avatarName = name || 'User';
    const paletteIndex = Math.abs(avatarName.charCodeAt(0) % AVATAR_PALETTES.length);
    
    return (
      <div className={`overflow-hidden rounded-full ${dimensions[size]} avatar-container`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <BoringAvatar
          size={size === 'sm' ? 28 : size === 'md' ? 32 : 40}
          name={avatarName}
          variant="beam"
          colors={AVATAR_PALETTES[paletteIndex]}
          square={false}
        />
      </div>
    );
  }

  // Regular avatar with image or fallback
  return (
    <Avatar className={`${dimensions[size]} avatar-container`}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} />
      ) : (
        <AvatarFallback>
          {isAssistant ? 
            <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : 
            <UserRound className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          }
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default MessageAvatar;
