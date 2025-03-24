
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, EyeOff, Bot } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { handleAvatarError, isImageUrl, getFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';
import { debugLog } from '@/utils/debugLogger';
import { isInCrossOriginContext } from '@/utils/crossOriginUtils';

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
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Process and normalize avatar URL on mount or when URL changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    if (avatarUrl) {
      debugLog('all', `MessageAvatar - Processing avatar URL: ${avatarUrl}`);
      
      const processUrl = async () => {
        try {
          if (isAssistant) {
            // For facilitator/assistant avatars, ensure proper normalization
            // Check if URL already contains 'crossorigin' marker - avoid double processing
            if (avatarUrl.includes('crossorigin=anonymous')) {
              if (isMounted) {
                setNormalizedUrl(avatarUrl);
                setImageError(false);
                setIsLoading(false);
              }
              debugLog('all', `MessageAvatar (Assistant) - URL already normalized: ${avatarUrl}`);
              return;
            }
            
            // Always normalize facilitator/assistant avatars to ensure they work
            const processedUrl = await getFacilitatorAvatarUrl({ profile_picture: avatarUrl });
            if (isMounted) {
              setNormalizedUrl(processedUrl);
              setImageError(false);
              setIsLoading(false);
            }
            debugLog('all', `MessageAvatar (Assistant) - Using normalized avatar URL: ${processedUrl}`);
          } else {
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
            debugLog('all', `MessageAvatar (Participant) - Using avatar URL: ${processedUrl}`);
          }
        } catch (error) {
          console.error('Error processing avatar URL:', error);
          if (isMounted) {
            setNormalizedUrl(null);
            setImageError(true);
            setIsLoading(false);
          }
        }
      };
      
      processUrl();
    } else {
      setNormalizedUrl(null);
      setImageError(false);
      setIsLoading(false);
    }
    
    return () => { isMounted = false; };
  }, [avatarUrl, isAssistant]);

  // Handle anonymized avatars
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
    console.warn(`Avatar image failed to load: ${normalizedUrl || avatarUrl}`);
    setImageError(true);
    handleAvatarError(e);
  };

  // Special handling for facilitator/assistant avatars
  if (isAssistant) {
    // If we have a valid avatar URL that looks like an image URL, use it
    if (normalizedUrl && normalizedUrl !== '/placeholder.svg' && isImageUrl(normalizedUrl) && !imageError) {
      debugLog('all', `Displaying facilitator avatar with URL: ${normalizedUrl}`);
      
      // Check if URL needs crossOrigin attribute
      const needsCrossOrigin = 
        isInCrossOriginContext() || 
        normalizedUrl.includes('crossorigin=anonymous') ||
        normalizedUrl.includes('supabase.co');
      
      return (
        <Avatar className={`${dimensions[size]} avatar-container ${isLoading ? 'bg-gray-100' : ''}`}>
          <AvatarImage 
            src={normalizedUrl} 
            alt={name || "Facilitator"} 
            onError={handleImageError}
            className="object-cover"
            crossOrigin={needsCrossOrigin ? "anonymous" : undefined}
          />
          <AvatarFallback className="bg-blue-100 text-blue-500">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      );
    }
    
    // Fallback for facilitator with no avatar
    return (
      <Avatar className={`${dimensions[size]} bg-blue-100 avatar-container`}>
        <AvatarFallback className="bg-blue-100 text-blue-500">
          <Bot className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Configure avatar palettes for consistency
  const AVATAR_PALETTES = [
    ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
    ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
    ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
    ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
    ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
  ];

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
        {isAssistant ? 
          <Bot className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : 
          <UserRound className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        }
      </AvatarFallback>
    </Avatar>
  );
};

export default MessageAvatar;
