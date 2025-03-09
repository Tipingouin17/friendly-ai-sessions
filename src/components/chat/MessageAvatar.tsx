
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, EyeOff } from 'lucide-react';
import BoringAvatar from 'boring-avatars';

interface MessageAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  anonymized?: boolean;
}

const MessageAvatar = ({ 
  avatarUrl, 
  name, 
  size = 'md',
  anonymized = false 
}: MessageAvatarProps) => {
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // For anonymized avatars, show a special avatar
  if (anonymized) {
    return (
      <Avatar className={`${dimensions[size]} bg-gray-100`}>
        <AvatarFallback className="bg-gray-100 text-gray-500">
          <EyeOff className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Handle boring-avatars
  if (avatarUrl?.startsWith('/api/avatar')) {
    const params = new URLSearchParams(avatarUrl.split('?')[1]);
    const avatarName = params.get('name') || name;
    const variant = params.get('variant') || 'beam';
    const paletteIndex = parseInt(params.get('palette') || '0');
    
    // Default palettes matching those in ParticipantSetup
    const AVATAR_PALETTES = [
      ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
      ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
      ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
      ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
      ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
      ['#FFD5C2', '#F28F3B', '#C8553D', '#588B8B', '#1B98E0'],
      ['#94C9A9', '#FFC09F', '#FFEE93', '#FCB0B3', '#B0DEFF'],
      ['#71A2B6', '#C6CDF7', '#D8BFD8', '#E4D3B0', '#D9D9F3'],
    ];
    
    return (
      <div className={`overflow-hidden rounded-full ${dimensions[size]}`} style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <BoringAvatar
          size={size === 'sm' ? 28 : size === 'md' ? 32 : 40}
          name={avatarName}
          variant={variant as any}
          colors={AVATAR_PALETTES[paletteIndex]}
          square={false}
        />
      </div>
    );
  }

  // Regular avatar
  return (
    <Avatar className={dimensions[size]}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={name} />
      ) : (
        <AvatarFallback>
          <UserRound className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        </AvatarFallback>
      )}
    </Avatar>
  );
};

export default MessageAvatar;
