/**
 * Facilitator Avatar
 *
 * Chat component for the AIfacilitator application.
 */

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot } from 'lucide-react';
import { handleAvatarError, isImageUrl, getFacilitatorAvatarUrl } from '@/utils/facilitatorUtils';
import { isInCrossOriginContext } from '@/utils/crossOriginUtils';
import { debugLog } from '@/utils/debugLogger';

interface FacilitatorAvatarProps {
  avatarUrl?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

const FacilitatorAvatar = ({ 
  avatarUrl, 
  name = "Facilitator", 
  size = 'md' 
}: FacilitatorAvatarProps) => {
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const dimensions = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-10 w-10'
  };

  // Process and normalize avatar URL
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    if (avatarUrl) {
      debugLog('all', `FacilitatorAvatar - Processing avatar URL: ${avatarUrl}`);
      
      const processUrl = async () => {
        try {
          // Check if URL already contains 'crossorigin' marker - avoid double processing
          if (avatarUrl.includes('crossorigin=anonymous')) {
            if (isMounted) {
              setNormalizedUrl(avatarUrl);
              setImageError(false);
              setIsLoading(false);
            }
            debugLog('all', `FacilitatorAvatar - URL already normalized: ${avatarUrl}`);
            return;
          }
          
          // Always normalize facilitator/assistant avatars to ensure they work
          const processedUrl = await getFacilitatorAvatarUrl({ profile_picture: avatarUrl });
          if (isMounted) {
            setNormalizedUrl(processedUrl);
            setImageError(false);
            setIsLoading(false);
          }
          debugLog('all', `FacilitatorAvatar - Using normalized avatar URL: ${processedUrl}`);
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
  }, [avatarUrl]);

  const handleImageError = () => {
    console.warn(`Facilitator avatar image failed to load: ${normalizedUrl || avatarUrl}`);
    setImageError(true);
  };

  // If we have a valid avatar URL that looks like an image URL, use it
  if (normalizedUrl && normalizedUrl !== '/placeholder.svg' && isImageUrl(normalizedUrl) && !imageError) {
    debugLog('all', `Displaying facilitator avatar with URL: ${normalizedUrl}`);
    
    // Check if URL needs crossOrigin attribute (includes legacy pre-migration storage URLs)
    const needsCrossOrigin = 
      isInCrossOriginContext() || 
      normalizedUrl.includes('crossorigin=anonymous') ||
      normalizedUrl.includes('supabase.co'); // Legacy: backward compat with pre-migration data
    
    return (
      <Avatar className={`${dimensions[size]} avatar-container ${isLoading ? 'bg-gray-100' : ''}`}>
        <AvatarImage 
          src={normalizedUrl} 
          alt={name} 
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
};

export default FacilitatorAvatar;
