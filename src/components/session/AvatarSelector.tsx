
import React from 'react';
import BoringAvatar from 'boring-avatars';
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface AvatarSelectorProps {
  avatarSeed: string;
  onAvatarChange: () => void;
}

const AvatarSelector: React.FC<AvatarSelectorProps> = ({ avatarSeed, onAvatarChange }) => {
  return (
    <div className="flex flex-col items-center mb-6">
      <div 
        className="cursor-pointer hover:opacity-90 transition-opacity rounded-full overflow-hidden border-2 border-gray-100 shadow-sm mb-2" 
        onClick={onAvatarChange}
      >
        <BoringAvatar
          size={80}
          name={avatarSeed}
          variant="beam"
          colors={['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90']}
          square={false}
        />
      </div>
      <Button 
        onClick={onAvatarChange} 
        variant="ghost" 
        size="sm" 
        className="text-xs text-gray-500 flex items-center gap-1"
      >
        <RefreshCw className="h-3 w-3" /> Change avatar
      </Button>
    </div>
  );
};

export default AvatarSelector;
