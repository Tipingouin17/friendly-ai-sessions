
import React from 'react';
import BoringAvatar from 'boring-avatars';

interface AvatarSelectorProps {
  avatarSeed: string;
  onAvatarChange: () => void;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ avatarSeed, onAvatarChange }) => {
  return (
    <div className="flex justify-center mb-6">
      <div className="cursor-pointer" onClick={onAvatarChange}>
        <BoringAvatar
          size={80}
          name={avatarSeed}
          variant="beam"
          colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
        />
        <p className="text-xs text-center mt-1 text-gray-500">Click to change</p>
      </div>
    </div>
  );
};

export default AvatarSelector;
