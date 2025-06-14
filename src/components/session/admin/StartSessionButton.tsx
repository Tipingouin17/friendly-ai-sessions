
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
    const success = await startSession();
    if (success) {
      onSessionStarted();
    }
  };

  const hasParticipants = participants.length > 0;
  const isDisabled = disabled || isStarting || !hasParticipants;

  return (
    <Button
      onClick={handleStartSession}
      disabled={isDisabled}
      size="lg"
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
    >
      {isStarting ? (
        <>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span>Starting Session...</span>
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
