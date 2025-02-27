
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ParticipantInfo } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound } from 'lucide-react';

interface ParticipantSelectorProps {
  participantCount: number;
  currentParticipant: number;
  onParticipantSwitch: (num: number) => void;
  participantNames?: { [key: number]: string };
  participants?: ParticipantInfo[];
}

const ParticipantSelector = ({
  participantCount,
  currentParticipant,
  onParticipantSwitch,
  participantNames = {},
  participants = []
}: ParticipantSelectorProps) => {
  return (
    <div className="px-4 py-2 border-t border-gray-100 bg-white">
      <Tabs value={currentParticipant.toString()} onValueChange={(value) => onParticipantSwitch(parseInt(value))}>
        <TabsList className="w-full justify-start">
          {Array.from({ length: participantCount }, (_, i) => i + 1).map((num) => {
            const participant = participants.find(p => p.id === num);
            const name = participant?.name || participantNames[num] || `Anonymous ${num}`;
            const avatar = participant?.avatar || null;
            
            return (
              <TabsTrigger 
                key={num} 
                value={num.toString()}
                className="min-w-[100px] flex items-center gap-2"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={avatar || undefined} alt={name} />
                  <AvatarFallback>
                    <UserRound className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{name}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ParticipantSelector;
