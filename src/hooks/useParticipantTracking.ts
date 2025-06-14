
import { useState, useEffect, useRef } from 'react';
import { ParticipantInfo } from '@/types/chat';
import { ConversationWithSession } from '@/types/database';
import { useParticipantDatabase } from './useParticipantDatabase';
import { useParticipantRealtimeSubscriptions } from './useParticipantRealtimeSubscriptions';

export function useParticipantTracking(
  locationState: any,
  conversationData: ConversationWithSession | null,
  currentConversationId: number | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to always have access to current participants state
  const participantsRef = useRef<ParticipantInfo[]>([]);
  
  // Update ref whenever participants state changes
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);
  
  // Fetch initial participants data using the database hook
  const { 
    participants: dbParticipants, 
    setParticipants: setDbParticipants,
    isLoading: dbIsLoading 
  } = useParticipantDatabase(currentConversationId);
  
  // Set up realtime subscriptions
  useParticipantRealtimeSubscriptions({
    conversationId: currentConversationId,
    setParticipants
  });
  
  // Sync database participants with local state
  useEffect(() => {
    if (dbParticipants.length > 0) {
      setParticipants(dbParticipants);
    }
    setIsLoading(dbIsLoading);
  }, [dbParticipants, dbIsLoading]);
  
  return { participants, setParticipants, isLoading };
}
