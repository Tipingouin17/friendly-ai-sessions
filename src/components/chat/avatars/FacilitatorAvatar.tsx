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
import InlineAvatar from './InlineAvatar';

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
    
    // Only set crossOrigin="anonymous" when the page is embedded in a cross-origin
    // iframe (e.g. participant join link). For normal page loads, omitting it avoids
    // an unnecessary CORS preflight that can block Railway storage images.
    const needsCrossOrigin = isInCrossOriginContext();
    
    return (
      // rounded-xl matches the MessageBubble's rounded-tl-none flat corner for visual alignment
      <Avatar className={`${dimensions[size]} !rounded-xl avatar-container ${isLoading ? 'bg-gray-100' : ''}`}>
        <AvatarImage 
          src={normalizedUrl} 
          alt={name} 
          onError={handleImageError}
          className="object-cover rounded-xl"
          crossOrigin={needsCrossOrigin ? "anonymous" : undefined}
        />
        <AvatarFallback className="p-0 bg-transparent rounded-xl">
          <InlineAvatar name={name} size={size} className="!rounded-xl" />
        </AvatarFallback>
      </Avatar>
    );
  }

  // Fallback: InlineAvatar with facilitator name for a coloured initial avatar
  return (
    <div className={`${dimensions[size]} overflow-hidden rounded-xl shrink-0`}>
      <InlineAvatar name={name} size={size} className="!rounded-xl" />
    </div>
  );
};

export default FacilitatorAvatar;
