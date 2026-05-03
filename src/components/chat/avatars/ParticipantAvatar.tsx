/**
 * Participant Avatar
 *
 * Chat component for the AIfacilitator application.
 * Uses InlineAvatar (pure SVG) as fallback when no avatarUrl is provided,
 * ensuring avatars always render without external network requests.
 */

import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import InlineAvatar from './InlineAvatar';
import { isImageUrl } from '@/utils/facilitatorUtils';
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

  // Process and normalize avatar URL
  useEffect(() => {
    let isMounted = true;

    if (avatarUrl) {
      debugLog('all', `ParticipantAvatar - Processing avatar URL: ${avatarUrl}`);
      let processedUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
      if (isInCrossOriginContext() && isImageUrl(processedUrl)) {
        processedUrl += (processedUrl.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
      }
      if (isMounted) {
        setNormalizedUrl(processedUrl);
        setImageError(false);
      }
    } else {
      if (isMounted) setNormalizedUrl(null);
    }

    return () => { isMounted = false; };
  }, [avatarUrl]);

  const handleImageError = () => {
    console.warn(`Participant avatar image failed to load: ${normalizedUrl || avatarUrl}`);
    setImageError(true);
  };

  // Use InlineAvatar (pure SVG, zero network) when no URL or image failed
  if (!normalizedUrl || normalizedUrl === '/placeholder.svg' || imageError) {
    return <InlineAvatar name={name || 'User'} size={size} />;
  }

  const needsCrossOrigin = isInCrossOriginContext();

  return (
    <Avatar className={size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'}>
      <AvatarImage
        src={normalizedUrl}
        alt={name}
        onError={handleImageError}
        className="object-cover"
        crossOrigin={needsCrossOrigin ? 'anonymous' : undefined}
      />
      <AvatarFallback>
        <InlineAvatar name={name || 'User'} size={size} />
      </AvatarFallback>
    </Avatar>
  );
};

export default ParticipantAvatar;
