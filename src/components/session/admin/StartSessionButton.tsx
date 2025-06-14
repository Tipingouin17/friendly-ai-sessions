
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import { useSessionStart } from '@/hooks/useSessionStart';
import { supabase } from '@/integrations/supabase/client';

interface StartSessionButtonProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
  onSessionStarted: () => void;
  disabled?: boolean;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  conversationId,
  participants: propParticipants,
  conversationData,
  onSessionStarted,
  disabled = false
}) => {
  const [actualParticipants, setActualParticipants] = useState(propParticipants);

  // Debug logging
  console.log('StartSessionButton Debug:', {
    conversationId,
    propParticipants: propParticipants?.length,
    actualParticipants: actualParticipants?.length,
    currentParticipantCount: conversationData?.current_participants,
    disabled
  });

  // Fetch actual participants if not provided
  useEffect(() => {
    const fetchParticipants = async () => {
      if (!conversationId || propParticipants.length > 0) return;
      
      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId);
          
        if (error) {
          console.error('Error fetching participants:', error);
        } else {
          console.log('Fetched participants from DB:', data?.length);
          setActualParticipants(data || []);
        }
      } catch (err) {
        console.error('Exception fetching participants:', err);
      }
    };

    fetchParticipants();
  }, [conversationId, propParticipants]);

  const { startSession, isStarting } = useSessionStart({
    conversationId,
    participants: actualParticipants,
    conversationData
  });

  const handleStartSession = async () => {
    console.log('Starting session with participants:', actualParticipants.length);
    const success = await startSession();
    if (success) {
      onSessionStarted();
    }
  };

  // Use fallback logic - check both participants array and current count
  const hasParticipants = actualParticipants.length > 0 || (conversationData?.current_participants > 0);
  const isDisabled = disabled || isStarting || !hasParticipants;

  console.log('Button state:', { hasParticipants, isDisabled, isStarting });

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
