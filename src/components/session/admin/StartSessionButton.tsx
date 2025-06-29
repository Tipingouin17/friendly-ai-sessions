import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface StartSessionButtonProps {
  conversationId: number | null;
  participants: any[];
  conversationData: any;
  onSessionStarted: () => void;
  disabled?: boolean;
  triggerSessionStart?: () => Promise<boolean>;
  sessionStartNotification?: string | null;
}

const StartSessionButton: React.FC<StartSessionButtonProps> = ({
  conversationId,
  participants: propParticipants,
  conversationData,
  onSessionStarted,
  disabled = false,
  triggerSessionStart,
  sessionStartNotification
}) => {
  const [isStarting, setIsStarting] = useState(false);
  const [actualParticipants, setActualParticipants] = useState(propParticipants);

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
          setActualParticipants(data || []);
        }
      } catch (err) {
        console.error('Exception fetching participants:', err);
      }
    };

    fetchParticipants();
  }, [conversationId, propParticipants]);

  const handleStartSession = async () => {
    if (!triggerSessionStart) return;
    
    setIsStarting(true);
    const success = await triggerSessionStart();
    setIsStarting(false);
    
    if (success) {
      onSessionStarted();
    }
  };

  const hasParticipants = actualParticipants.length > 0 || (conversationData?.current_participants > 0);
  const isDisabled = disabled || isStarting || !hasParticipants;
  const isSessionStarted = conversationData?.session_started;

  // Show session started state
  if (isSessionStarted) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-800 font-medium">Session Active</span>
          <span className="text-green-600 text-sm">({actualParticipants.length} participants)</span>
        </div>
        
        {sessionStartNotification && (
          <div className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded border border-green-200">
            {sessionStartNotification}
          </div>
        )}
      </div>
    );
  }

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
