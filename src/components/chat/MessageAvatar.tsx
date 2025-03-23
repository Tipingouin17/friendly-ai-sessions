
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, EyeOff, Bot, Image, AlertCircle } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { handleAvatarError, isImageUrl, normalizeFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';
import { debugLog } from '@/utils/debugLogger';

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
  const [imageError, setImageError] = useState(false);
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Only log when component is first mounted, not on every render
  useEffect(() => {
    if (isAssistant && avatarUrl) {
      debugLog('all', `Facilitator avatar loaded: ${avatarUrl}`);
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  if (anonymized) {
    return (
      <Avatar className={`${dimensions[size]} bg-gray-100 avatar-container`}>
        <AvatarFallback className="bg-gray-100 text-gray-500">
          <EyeOff className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    console.error(`Avatar image failed to load: ${avatarUrl}`);
    setImageError(true);
    handleAvatarError(e);
  };

  if (isAssistant) {
    if (avatarUrl && avatarUrl !== '/placeholder.svg' && isImageUrl(avatarUrl)) {
      const cleanUrl = normalizeFacilitatorAvatarUrl(avatarUrl);
      
      // Remove console.log to reduce noise
      
      return (
        <Avatar className={`${dimensions[size]} avatar-container`}>
          <AvatarImage 
            src={cleanUrl} 
            alt={name || "Facilitator"} 
            onError={handleImageError}
          />
          <AvatarFallback className="bg-blue-100 text-blue-500">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    
    // Remove console.log to reduce noise
    return (
      <Avatar className={`${dimensions[size]} bg-blue-100 avatar-container`}>
        <AvatarFallback className="bg-blue-100 text-blue-500">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  const AVATAR_PALETTES = [
    ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
    ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
    ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
    ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
    ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
  ];

  if (!avatarUrl || avatarUrl === '' || avatarUrl === '/placeholder.svg' || imageError) {
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

  if (avatarUrl?.startsWith('/api/avatar') || avatarUrl?.includes('api.qrserver.com')) {
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

  return (
    <Avatar className={`${dimensions[size]} avatar-container`}>
      <AvatarImage 
        src={avatarUrl} 
        alt={name} 
        onError={handleImageError}
      />
      <AvatarFallback>
        {isAssistant ? 
          <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : 
          <UserRound className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        }
      </AvatarFallback>
    </Avatar>
  );
};

export default MessageAvatar;
