
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { handleAvatarError, isImageUrl } from '@/utils/facilitatorUtils';
import { isInCrossOriginContext } from '@/utils/crossOriginUtils';
import { debugLog } from '@/utils/debugLogger';

interface ParticipantAvatarProps {
  avatarUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const ParticipantAvatar = ({ 
  avatarUrl, 
  name, 
  size = 'md' 
}: ParticipantAvatarProps) => {
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Configure avatar palettes for consistency
  const AVATAR_PALETTES = [
    ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
    ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
    ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
    ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
    ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
  ];

  // Process and normalize avatar URL
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    if (avatarUrl) {
      debugLog('all', `ParticipantAvatar - Processing avatar URL: ${avatarUrl}`);
      
      // For participant avatars, just normalize the URL for any double slashes
      let processedUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
      
      // Add crossorigin marker if needed
      if (isInCrossOriginContext() && isImageUrl(processedUrl)) {
        processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
      }
      
      if (isMounted) {
        setNormalizedUrl(processedUrl);
        setImageError(false);
        setIsLoading(false);
      }
      debugLog('all', `ParticipantAvatar - Using avatar URL: ${processedUrl}`);
    } else {
      setNormalizedUrl(null);
      setImageError(false);
      setIsLoading(false);
    }
    
    return () => { isMounted = false; };
  }, [avatarUrl]);

  const handleImageError = () => {
    console.warn(`Participant avatar image failed to load: ${normalizedUrl || avatarUrl}`);
    setImageError(true);
  };

  // Default to Boring Avatar if no avatar URL or image failed to load
  if (!normalizedUrl || normalizedUrl === '/placeholder.svg' || imageError) {
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

  // Check if URL needs crossOrigin attribute
  const needsCrossOrigin = 
    isInCrossOriginContext() || 
    normalizedUrl.includes('crossorigin=anonymous') ||
    normalizedUrl.includes('supabase.co');

  // Use provided avatar URL
  return (
    <Avatar className={`${dimensions[size]} avatar-container ${isLoading ? 'bg-gray-100' : ''}`}>
      <AvatarImage 
        src={normalizedUrl} 
        alt={name} 
        onError={handleImageError}
        className="object-cover"
        crossOrigin={needsCrossOrigin ? "anonymous" : undefined}
      />
      <AvatarFallback>
        <UserRound className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </AvatarFallback>
    </Avatar>
  );
};

export default ParticipantAvatar;
