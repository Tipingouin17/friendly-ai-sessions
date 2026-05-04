/**
 * Message Avatar
 *
 * Chat component for the AIfacilitator application.
 */

import React from 'react';
import AnonymousAvatar from './avatars/AnonymousAvatar';
import FacilitatorAvatar from './avatars/FacilitatorAvatar';
import ParticipantAvatar from './avatars/ParticipantAvatar';
import AdminAvatar from './avatars/AdminAvatar';

interface MessageAvatarProps {
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  anonymized?: boolean;
  isAssistant?: boolean;
  isAdmin?: boolean;
}

const MessageAvatar = ({ 
  avatarUrl,
  avatarSeed,
  name, 
  size = 'md',
  anonymized = false,
  isAssistant = false,
  isAdmin = false
}: MessageAvatarProps) => {
  // Handle anonymized avatars
  if (anonymized) {
    return <AnonymousAvatar size={size} />;
  }

  // Handle admin avatars
  if (isAdmin) {
    return <AdminAvatar size={size} name={name} />;
  }

  // Handle facilitator/assistant avatars
  if (isAssistant) {
    return <FacilitatorAvatar avatarUrl={avatarUrl} name={name} size={size} />;
  }

  // Default to participant avatar
  return <ParticipantAvatar avatarUrl={avatarUrl} avatarSeed={avatarSeed} name={name} size={size} />;
};

export default MessageAvatar;
