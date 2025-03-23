
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, EyeOff, Bot } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { normalizeFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';

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
  const [normalizedUrl, setNormalizedUrl] = useState<string>(avatarUrl || '/placeholder.svg');
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    // For assistants/facilitators, normalize the URL
    if (isAssistant && avatarUrl) {
      const fixed = normalizeFacilitatorAvatarUrl(avatarUrl);
      console.log(`MessageAvatar: Normalized facilitator URL from ${avatarUrl} to ${fixed}`);
      setNormalizedUrl(fixed);
    } else {
      setNormalizedUrl(avatarUrl || '/placeholder.svg');
    }
    
    // Reset error state when avatarUrl changes
    setHasError(false);
  }, [avatarUrl, isAssistant]);
  
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

  // For assistant/facilitator avatars
  if (isAssistant) {
    // If we have a valid facilitator avatar URL that's not a placeholder or API-generated avatar
    // and there's no error loading it
    if (!hasError && 
        normalizedUrl && 
        normalizedUrl !== '/placeholder.svg' && 
        !normalizedUrl.includes('api.qrserver.com') &&
        !normalizedUrl.startsWith('/api/avatar')) {
      
      return (
        <Avatar className={`${dimensions[size]} avatar-container`}>
          <AvatarImage 
            src={normalizedUrl} 
            alt={name || "Facilitator"} 
            onError={(e) => {
              console.log(`Error loading facilitator avatar: ${normalizedUrl}`);
              setHasError(true);
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <AvatarFallback className="bg-blue-100 text-blue-500">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    
    // Otherwise use a consistent blue avatar with bot icon
    return (
      <Avatar className={`${dimensions[size]} bg-blue-100 avatar-container`}>
        <AvatarFallback className="bg-blue-100 text-blue-500">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Define avatar palettes for participant avatars
  const AVATAR_PALETTES = [
    ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
    ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
    ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
    ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
    ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
  ];

  // Generate avatar for users with no specific avatar
  if (!normalizedUrl || normalizedUrl === '' || normalizedUrl === '/placeholder.svg' || 
      normalizedUrl?.startsWith('/api/avatar') || normalizedUrl?.includes('api.qrserver.com') || hasError) {
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

  // Regular avatar with image or fallback
  return (
    <Avatar className={`${dimensions[size]} avatar-container`}>
      <AvatarImage 
        src={normalizedUrl} 
        alt={name} 
        onError={(e) => {
          console.log(`Error loading avatar: ${normalizedUrl}`);
          setHasError(true);
          e.currentTarget.src = '/placeholder.svg';
        }}
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
