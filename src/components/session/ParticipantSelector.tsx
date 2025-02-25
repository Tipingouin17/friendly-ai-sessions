
import React from 'react';

interface ParticipantSelectorProps {
  participantCount: number;
  currentParticipant: number;
  onParticipantSwitch: (num: number) => void;
}

const ParticipantSelector = ({ 
  participantCount, 
  currentParticipant, 
  onParticipantSwitch 
}: ParticipantSelectorProps) => {
  return (
    <div className="flex items-center justify-center gap-2 p-2 border-t">
      {Array.from({ length: participantCount || 1 }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          onClick={() => onParticipantSwitch(num)}
          className={`px-3 py-1 rounded ${
            currentParticipant === num 
              ? 'bg-primary text-white' 
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          P{num}
        </button>
      ))}
    </div>
  );
};

export default ParticipantSelector;
