
import React from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useSessionStart } from '@/hooks/useSessionStart';

interface StartSessionButtonProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
  onSessionStarted: () => void;
  disabled?: boolean;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  conversationId,
  participants,
  conversationData,
  onSessionStarted,
  disabled = false
}) => {
  const { startSession, isStarting } = useSessionStart({
    conversationId,
    participants,
    conversationData
  });

  const handleStartSession = async () => {
    console.log('🚀 Starting session with AI welcome message generation');
    console.log('Session context:', {
      conversationId,
      participantCount: participants.length,
      facilitatorName: conversationData?.sessions?.facilitator_details?.title,
      participantDescription: conversationData?.participant_description
    });
    
    const success = await startSession();
    if (success) {
      console.log('✅ Session started successfully with AI welcome message');
      onSessionStarted();
    }
  };

  // Use participants array length for enable/disable logic
  const hasParticipants = participants.length > 0;
  const isDisabled = disabled || isStarting || !hasParticipants;

  return (
    <Button
      onClick={handleStartSession}
      disabled={isDisabled}
      size="lg"
      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white disabled:bg-gray-300"
    >
      {isStarting ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Starting Session & Generating AI Welcome...</span>
        </>
      ) : (
        <>
          <Play className="h-5 w-5" />
          <span>Start Session</span>
        </>
      )}
    </Button>
  );
};

export default StartSessionButton;
