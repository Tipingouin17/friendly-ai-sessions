
import React from 'react';
import AnonymousAvatar from './avatars/AnonymousAvatar';
import FacilitatorAvatar from './avatars/FacilitatorAvatar';
import ParticipantAvatar from './avatars/ParticipantAvatar';

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
  // Handle anonymized avatars
  if (anonymized) {
    return <AnonymousAvatar size={size} />;
  }

  // Handle facilitator/assistant avatars
  if (isAssistant) {
    return <FacilitatorAvatar avatarUrl={avatarUrl} name={name} size={size} />;
  }

  // Default to participant avatar
  return <ParticipantAvatar avatarUrl={avatarUrl} name={name} size={size} />;
};

export default MessageAvatar;
