
import React, { useState } from 'react';
import { ParticipantInfo } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserRound, ChevronRight, UserPlus, Save } from 'lucide-react';

const AVATAR_OPTIONS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
  '/avatars/avatar-7.png',
  '/avatars/avatar-8.png',
];

// Use placeholder images for now - in production these would be actual avatar images
const DEFAULT_AVATAR = '/placeholder.svg';

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
      avatar: DEFAULT_AVATAR
    }))
  );
  const [selectedAvatar, setSelectedAvatar] = useState(DEFAULT_AVATAR);
  const [nameInput, setNameInput] = useState('');

  const handleNext = () => {
    // Update current participant info
    setParticipants(prev => 
      prev.map(p => 
        p.id === currentStep 
          ? { ...p, name: nameInput || `Anonymous ${currentStep}`, avatar: selectedAvatar } 
          : p
      )
    );
    
    if (currentStep < participantCount) {
      // Move to next participant
      setCurrentStep(prev => prev + 1);
      // Reset inputs for next participant
      setNameInput('');
      setSelectedAvatar(DEFAULT_AVATAR);
    } else {
      // All participants are set up, complete the process
      onComplete(participants.map((p, i) => 
        p.id === participantCount 
          ? { ...p, name: nameInput || `Anonymous ${p.id}`, avatar: selectedAvatar }
          : p
      ));
    }
  };

  const selectAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
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
        
        <label className="block text-gray-700 mb-2">Choose Avatar</label>
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[DEFAULT_AVATAR, ...AVATAR_OPTIONS].map((avatar, index) => (
            <button
              key={index}
              onClick={() => selectAvatar(avatar)}
              className={`p-1 rounded-lg transition-all ${selectedAvatar === avatar ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-gray-100'}`}
            >
              <img 
                src={avatar} 
                alt={`Avatar option ${index}`} 
                className="w-12 h-12 object-cover rounded-full"
              />
            </button>
          ))}
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
