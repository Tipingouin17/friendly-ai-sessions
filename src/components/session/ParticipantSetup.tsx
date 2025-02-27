
import React, { useState } from 'react';
import { ParticipantInfo } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserRound, ChevronRight, Save } from 'lucide-react';
import Avatar from 'boring-avatars';

// Avatar palette presets
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

const AVATAR_VARIANTS = ['marble', 'beam', 'pixel', 'sunset', 'ring', 'bauhaus'];

interface ParticipantSetupProps {
  participantCount: number;
  onComplete: (participants: ParticipantInfo[]) => void;
  facilitatorTitle: string | undefined;
}

const ParticipantSetup = ({ 
  participantCount, 
  onComplete,
  facilitatorTitle
}: ParticipantSetupProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [participants, setParticipants] = useState<ParticipantInfo[]>(
    Array.from({ length: participantCount }, (_, i) => ({
      id: i + 1,
      name: `Anonymous ${i + 1}`,
      avatar: ''
    }))
  );

  // Now we'll use a selectedAvatar state with format "variant:index" for easy tracking
  const [selectedAvatar, setSelectedAvatar] = useState('marble:0');
  const [nameInput, setNameInput] = useState('');
  
  const handleNext = () => {
    // Update current participant info
    const [variant, paletteIndex] = selectedAvatar.split(':');
    const avatarUrl = `/api/avatar?name=${nameInput || 'Anonymous'}&variant=${variant}&palette=${paletteIndex}`;
    
    setParticipants(prev => 
      prev.map(p => 
        p.id === currentStep 
          ? { ...p, name: nameInput || `Anonymous ${currentStep}`, avatar: avatarUrl } 
          : p
      )
    );
    
    if (currentStep < participantCount) {
      // Move to next participant
      setCurrentStep(prev => prev + 1);
      // Reset inputs for next participant
      setNameInput('');
      setSelectedAvatar('marble:0');
    } else {
      // All participants are set up, complete the process
      onComplete(participants.map((p, i) => {
        if (p.id === participantCount) {
          const [variant, paletteIndex] = selectedAvatar.split(':');
          const avatarUrl = `/api/avatar?name=${nameInput || 'Anonymous'}&variant=${variant}&palette=${paletteIndex}`;
          return { ...p, name: nameInput || `Anonymous ${p.id}`, avatar: avatarUrl };
        }
        return p;
      }));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2 text-center">Participant Setup</h2>
      <p className="text-gray-600 mb-6 text-center">
        {facilitatorTitle ? `Setup for your session with ${facilitatorTitle}` : 'Setup your session participants'}
      </p>
      
      <div className="flex items-center justify-center mb-4">
        <div className="bg-purple-100 text-purple-800 rounded-full w-8 h-8 flex items-center justify-center font-bold">
          {currentStep}
        </div>
        <span className="ml-2 text-gray-600">of {participantCount} Participants</span>
      </div>
      
      <div className="w-full mb-6">
        <label className="block text-gray-700 mb-2">Participant Name</label>
        <Input
          placeholder={`Participant ${currentStep}`}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          className="mb-4"
        />
        
        <label className="block text-gray-700 mb-2">Choose Avatar Style</label>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {AVATAR_VARIANTS.map((variant, variantIndex) => {
            const selected = selectedAvatar.startsWith(variant);
            return (
              <button
                key={variant}
                onClick={() => setSelectedAvatar(`${variant}:0`)}
                className={`p-2 rounded-lg transition-all flex flex-col items-center ${selected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-100'}`}
              >
                <Avatar
                  size={40}
                  name={nameInput || `Participant ${currentStep}`}
                  variant={variant as any}
                  colors={AVATAR_PALETTES[0]}
                />
                <span className="text-xs mt-1 text-gray-600">{variant}</span>
              </button>
            );
          })}
        </div>
        
        <label className="block text-gray-700 mb-2">Choose Color Palette</label>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {AVATAR_PALETTES.map((palette, paletteIndex) => {
            const [activeVariant] = selectedAvatar.split(':');
            const selected = selectedAvatar === `${activeVariant}:${paletteIndex}`;
            
            return (
              <button
                key={paletteIndex}
                onClick={() => setSelectedAvatar(`${activeVariant}:${paletteIndex}`)}
                className={`p-2 rounded-lg transition-all ${selected ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-100'}`}
              >
                <Avatar
                  size={40}
                  name={nameInput || `Participant ${currentStep}`}
                  variant={activeVariant as any}
                  colors={palette}
                />
              </button>
            );
          })}
        </div>
        
        <div className="rounded-lg p-3 bg-gray-50 border border-gray-200 mb-4 flex justify-center">
          <div className="text-center">
            <div className="mb-2">
              <Avatar
                size={80}
                name={nameInput || `Participant ${currentStep}`}
                variant={selectedAvatar.split(':')[0] as any}
                colors={AVATAR_PALETTES[parseInt(selectedAvatar.split(':')[1])]}
              />
            </div>
            <p className="text-gray-700 font-medium">
              {nameInput || `Participant ${currentStep}`}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between w-full">
        <Button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2"
        >
          {currentStep === participantCount ? <Save className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {currentStep === participantCount ? 'Start Session' : 'Next Participant'}
        </Button>
      </div>
    </div>
  );
};

export default ParticipantSetup;
