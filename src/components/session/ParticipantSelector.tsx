
import React from 'react';
import { Button } from '@/components/ui/button';

interface ParticipantSelectorProps {
  participantCount: number;
  currentParticipant: number;
  onParticipantSwitch: (num: number) => void;
  participantNames?: { [key: number]: string };
}

const ParticipantSelector = ({
  participantCount,
  currentParticipant,
  onParticipantSwitch,
  participantNames = {}
}: ParticipantSelectorProps) => {
  return (
    <div className="flex gap-2 p-4 border-t border-gray-100 bg-white">
      {Array.from({ length: participantCount }, (_, i) => i + 1).map((num) => (
        <Button
          key={num}
          onClick={() => onParticipantSwitch(num)}
          variant={currentParticipant === num ? "default" : "outline"}
          className="min-w-[60px]"
        >
          {participantNames[num] || `P${num}`}
        </Button>
      ))}
    </div>
  );
};

export default ParticipantSelector;
