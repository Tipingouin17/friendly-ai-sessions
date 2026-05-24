/**
 * use Participant Realtime Subscriptions
 *
 * Hook for the AIfacilitator application.
 */

import { useEffect, useRef } from 'react';
import { ParticipantInfo } from '@/types/chat';
import api from "@/lib/api";

interface UseParticipantRealtimeSubscriptionsProps {
  conversationId: number | null;
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
}

export function useParticipantRealtimeSubscriptions({
  conversationId,
  setParticipants
}: UseParticipantRealtimeSubscriptionsProps) {
  const participantsChannelRef = useRef<any>(null);
  const participantEventsChannelRef = useRef<any>(null);
  const cleanupAttemptedRef = useRef({
    participants: false,
    events: false
  });

  useEffect(() => {
    if (!conversationId) return;
    
    // Clean up any existing subscription first
    if (participantsChannelRef.current) {
      try {
        const channel = participantsChannelRef.current;
        participantsChannelRef.current = null;
        cleanupAttemptedRef.current.participants = true;
        
        api.removeChannel(channel);
      } catch (err) {
        console.error('Error cleaning up participants channel:', err);
      }
    }
    
    // Generate unique channel names with timestamps and random strings to prevent conflicts
    const participantsChannelName = `participants-${conversationId}`;
    
    try {
      // Subscribe to changes in session_participants table
      const channel = api
        .channel(participantsChannelName)
        .on('postgres_changes', {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            // New participant joined
            const newParticipant = payload.new;
            
            // Use functional update to avoid stale closure issues
            setParticipants(prevParticipants => {
              // Check if participant already exists to prevent duplicates
              const exists = prevParticipants.some(p => p.id === newParticipant.participant_id);
              if (exists) {
                return prevParticipants;
              }
              
              // Add new participant
              const participantInfo: ParticipantInfo = {
                id: newParticipant.participant_id,
                name: newParticipant.name || `Participant ${newParticipant.participant_id}`,
                avatar: newParticipant.avatar_seed ? `/api/avatar?name=${newParticipant.avatar_seed}&variant=beam&palette=0` : null,
                avatarSeed: newParticipant.avatar_seed || null,
                isAnonymous: newParticipant.is_anonymous || false,
                isAdmin: newParticipant.is_admin || false,
                joinedAt: new Date(newParticipant.created_at),
                lastActive: new Date(newParticipant.created_at),
              };
              
              return [...prevParticipants, participantInfo];
            });
          } else if (payload.eventType === 'UPDATE') {
            // Participant updated (e.g., name change, status change)
            const updatedParticipant = payload.new;
            
            setParticipants(prevParticipants => prevParticipants.map(p => {
              if (p.id === updatedParticipant.participant_id) {
                return {
                  ...p,
                  name: updatedParticipant.name || p.name,
                  avatar: updatedParticipant.avatar_seed ? `/api/avatar?name=${updatedParticipant.avatar_seed}&variant=beam&palette=0` : p.avatar,
                  avatarSeed: updatedParticipant.avatar_seed || p.avatarSeed,
                  isAnonymous: updatedParticipant.is_anonymous || p.isAnonymous,
                  isAdmin: updatedParticipant.is_admin || p.isAdmin,
                  lastActive: new Date(updatedParticipant.created_at),
                };
              }
              return p;
            }));
          } else if (payload.eventType === 'DELETE') {
            // Participant removed
            const removedParticipant = payload.old;
            
            setParticipants(prevParticipants => prevParticipants.filter(p => p.id !== removedParticipant.participant_id));
          }
        })
        .subscribe(status => { /* no-op */ });
        
      // Store the channel reference for cleanup
      participantsChannelRef.current = channel;
    } catch (err) {
      console.error('Error subscribing to participants:', err);
    }
    
    // Second channel for session_events
    // Clean up any existing events subscription first
    if (participantEventsChannelRef.current) {
      try {
        const eventsChannel = participantEventsChannelRef.current;
        participantEventsChannelRef.current = null;
        cleanupAttemptedRef.current.events = true;
        
        api.removeChannel(eventsChannel);
      } catch (err) {
        console.error('Error cleaning up participant events channel:', err);
      }
    }
    
    const eventsChannelName = `participant-events-${conversationId}`;
    
    try {
      // Subscribe to participant events
      const eventsChannel = api
        .channel(eventsChannelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          
          // We're interested in join/leave events
          if (payload.new?.event_type === 'participant_joined') {
            const eventData = payload.new.data;
            
            if (eventData?.participant_id && eventData?.participant_name) {
              // Use functional update to avoid stale closure issues
              setParticipants(prevParticipants => {
                // Check if we already have this participant
                const exists = prevParticipants.some(p => p.id === eventData.participant_id);
                if (exists) {
                  // Update existing participant with latest data
                  return prevParticipants.map(p => 
                    p.id === eventData.participant_id 
                      ? { ...p, name: eventData.participant_name || p.name }
                      : p
                  );
                }
                
                // Add new participant with available data
                const participantInfo: ParticipantInfo = {
                  id: eventData.participant_id,
                  name: eventData.participant_name || `Participant ${eventData.participant_id}`,
                  avatar: eventData.avatar_url || null,
                  avatarSeed: eventData.avatar_seed || null,
                  isAnonymous: eventData.is_anonymous || false,
                  isAdmin: eventData.is_admin || false,
                  joinedAt: new Date(),
                  lastActive: new Date(),
                };
                
                return [...prevParticipants, participantInfo];
              });
            }
          } else if (payload.new?.event_type === 'participant_removed') {
            // A participant was removed
            const eventData = payload.new.data;
            
            if (eventData?.participant_id) {
              setParticipants(prevParticipants => prevParticipants.filter(p => p.id !== eventData.participant_id));
            }
          }
        })
        .subscribe(status => { /* no-op */ });
        
      // Store the events channel reference for cleanup
      participantEventsChannelRef.current = eventsChannel;
    } catch (err) {
      console.error('Error subscribing to participant events:', err);
    }
    
    // Clean up both channel subscriptions on unmount
    return () => {
      try {
        if (participantsChannelRef.current && !cleanupAttemptedRef.current.participants) {
          const channel = participantsChannelRef.current;
          participantsChannelRef.current = null;
          cleanupAttemptedRef.current.participants = true;
          api.removeChannel(channel);
        }
      } catch (err) {
        console.error('Error cleaning up participants channel:', err);
        participantsChannelRef.current = null;
      }
      
      try {
        if (participantEventsChannelRef.current && !cleanupAttemptedRef.current.events) {
          const eventsChannel = participantEventsChannelRef.current;
          participantEventsChannelRef.current = null;
          // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional session lifecycle boundary: dependencies are mediated by refs/one-shot guards so realtime subscriptions, timers, and recovery flows are not replayed by changing callback identities.
          cleanupAttemptedRef.current.events = true;
          api.removeChannel(eventsChannel);
        }
      } catch (err) {
        console.error('Error cleaning up participant events channel:', err);
        participantEventsChannelRef.current = null;
      }
    };
  }, [conversationId, setParticipants]);

  return {
    participantsChannelRef,
    participantEventsChannelRef
  };
}
