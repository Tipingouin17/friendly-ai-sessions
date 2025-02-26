
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="px-4 py-2 bg-white">
      <Tabs value={currentParticipant.toString()} onValueChange={(value) => onParticipantSwitch(parseInt(value))}>
        <TabsList className="w-full justify-start">
          {Array.from({ length: participantCount }, (_, i) => i + 1).map((num) => (
            <TabsTrigger 
              key={num} 
              value={num.toString()}
              className="min-w-[100px]"
            >
              {participantNames[num] || `P${num}`}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default ParticipantSelector;
