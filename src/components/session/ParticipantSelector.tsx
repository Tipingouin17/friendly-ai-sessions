
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantInfo } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound, LockIcon } from 'lucide-react';
import BoringAvatar from 'boring-avatars';
import { cn } from "@/lib/utils";

interface ParticipantSelectorProps {
  participantCount: number;
  currentParticipant: number;
  onParticipantSwitch: (num: number) => void;
  participantNames?: { [key: number]: string };
  participants?: ParticipantInfo[];
  disableSwitching?: boolean;
  currentUserParticipantId?: number | null;
}

const ParticipantSelector = ({
  participantCount,
  currentParticipant,
  onParticipantSwitch,
  participantNames = { /* no-op */ },
  participants = [],
  disableSwitching = false,
  currentUserParticipantId
}: ParticipantSelectorProps) => {
  // Helper to render avatar
  const renderAvatar = (avatarUrl: string | undefined, name: string) => {
    if (avatarUrl?.startsWith('/api/avatar')) {
      // Use boring-avatars for dynamically generated avatars
      const params = new URLSearchParams(avatarUrl.split('?')[1]);
      const avatarName = params.get('name') || name;
      const variant = params.get('variant') || 'marble';
      const paletteIndex = parseInt(params.get('palette') || '0');
      
      // Default palettes matching those in ParticipantSetup
      const AVATAR_PALETTES = [
        ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
        ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
        ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
        ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
        ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
        ['#FFD5C2', '#F28F3B', '#C8553D', '#588B8B', '#1B98E0'],
        ['#94C9A9', '#FFC09F', '#FFEE93', '#FCB0B3', '#B0DEFF'],
        ['#71A2B6', '#C6CDF7', '#D8BFD8', '#E4D3B0', '#D9D9F3'],
      ];
      
      return (
        <div className="overflow-hidden rounded-full w-6 h-6">
          <BoringAvatar
            size={24}
            name={avatarName}
            variant={variant as any}
            colors={AVATAR_PALETTES[paletteIndex]}
            square={false}
          />
        </div>
      );
    }
    
    // Fallback to regular avatar
    return (
      <Avatar className="w-6 h-6">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>
          <UserRound className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-white">
      <Tabs value={currentParticipant.toString()} onValueChange={(value) => onParticipantSwitch(parseInt(value))}>
        <TabsList className="w-full justify-start">
          {Array.from({ length: participantCount }, (_, i) => i + 1).map((num) => {
            const participant = participants.find(p => p.id === num);
            const name = participant?.name || participantNames[num] || `Anonymous ${num}`;
            const avatar = participant?.avatar || null;
            const isLocked = disableSwitching && num !== currentUserParticipantId;
            
            return (
              <TabsTrigger 
                key={num} 
                value={num.toString()}
                className={cn(
                  "min-w-[100px] flex items-center gap-2",
                  isLocked && "opacity-50 cursor-not-allowed"
                )}
                disabled={isLocked}
              >
                {renderAvatar(avatar, name)}
                <span className="truncate">{name}</span>
                {isLocked && <LockIcon className="w-3 h-3 ml-1" />}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ParticipantSelector;
