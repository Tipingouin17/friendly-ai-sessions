
import { useState, useEffect, useRef } from 'react';
import { ParticipantInfo } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { ConversationWithSession } from '@/types/database';

export function useParticipantTracking(
  locationState: any,
  conversationData: ConversationWithSession | null,
  currentConversationId: number | null
) {
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const participantsChannelRef = useRef<any>(null);
  const participantEventsChannelRef = useRef<any>(null);
  const cleanupAttemptedRef = useRef({
    participants: false,
    events: false
  });
  
  // Fetch initial participants data
  useEffect(() => {
    if (!currentConversationId) {
      console.log("No conversationId provided to useParticipantDatabase, skipping fetch");
      setIsLoading(false);
      return;
    }
    
    const fetchParticipants = async () => {
      try {
        console.log(`Fetching participants for conversation: ${currentConversationId}`);
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', currentConversationId)
          .order('created_at', { ascending: true });
          
        if (error) {
          throw error;
        }
        
        // Transform database model to ParticipantInfo
        const participantInfos: ParticipantInfo[] = data.map(p => ({
          id: p.participant_id,
          name: p.name || `Participant ${p.participant_id}`,
          avatar: p.avatar_seed ? `/api/avatar?name=${p.avatar_seed}&variant=beam&palette=0` : null,
          avatarSeed: p.avatar_seed || null,
          isAnonymous: p.is_anonymous || false,
          isAdmin: p.is_admin || false,
          joinedAt: new Date(p.created_at),
          lastActive: new Date(p.created_at), // Use created_at as fallback since updated_at might not exist
        }));
        
        setParticipants(participantInfos);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching participants:", error);
        setIsLoading(false);
      }
    };
    
    fetchParticipants();
  }, [currentConversationId]);
  
  // Set up real-time participant tracking
  useEffect(() => {
    if (!currentConversationId) return;
    
    console.log(`Setting up realtime participant tracking for conversation: ${currentConversationId}`);
    
    // Clean up any existing subscription first
    if (participantsChannelRef.current) {
      try {
        const channel = participantsChannelRef.current;
        participantsChannelRef.current = null; // Clear ref first
        cleanupAttemptedRef.current.participants = true;
        
        console.info('Cleaning up participants channel before creating new one');
        supabase.removeChannel(channel);
      } catch (err) {
        console.error('Error cleaning up participants channel:', err);
      }
    }
    
    // Generate unique channel names with timestamps and random strings to prevent conflicts
    const participantsChannelName = `participants-${currentConversationId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      // Subscribe to changes in session_participants table
      const channel = supabase
        .channel(participantsChannelName)
        .on('postgres_changes', {
          event: '*', // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'session_participants',
          filter: `conversation_id=eq.${currentConversationId}`
        }, (payload) => {
          // Handle different event types
          if (payload.eventType === 'INSERT') {
            // New participant joined
            const newParticipant = payload.new;
            
            // Check if participant already exists to prevent duplicates
            const exists = participants.some(p => p.id === newParticipant.participant_id);
            if (exists) return;
            
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
            
            setParticipants(prev => [...prev, participantInfo]);
          } else if (payload.eventType === 'UPDATE') {
            // Participant updated (e.g., name change, status change)
            const updatedParticipant = payload.new;
            
            setParticipants(prev => prev.map(p => {
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
            
            setParticipants(prev => prev.filter(p => p.id !== removedParticipant.participant_id));
          }
        })
        .subscribe(status => {
          console.info(`Participants channel subscription status: ${status}`);
        });
        
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
        participantEventsChannelRef.current = null; // Clear ref first
        cleanupAttemptedRef.current.events = true;
        
        console.info('Cleaning up participant events channel before creating new one');
        supabase.removeChannel(eventsChannel);
      } catch (err) {
        console.error('Error cleaning up participant events channel:', err);
      }
    }
    
    const eventsChannelName = `participant-events-${currentConversationId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    try {
      // Subscribe to participant events
      const eventsChannel = supabase
        .channel(eventsChannelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'session_events',
          filter: `conversation_id=eq.${currentConversationId}`
        }, (payload) => {
          // We're interested in join/leave events
          if (payload.new?.event_type === 'participant_joined') {
            // A new participant joined - this may already be handled by the session_participants subscription
            // but we'll update the UI quicker this way
            const eventData = payload.new.data;
            
            if (eventData?.participant_id) {
              // Check if we already have this participant
              const exists = participants.some(p => p.id === eventData.participant_id);
              if (exists) return;
              
              // Add new participant with available data
              const participantInfo: ParticipantInfo = {
                id: eventData.participant_id,
                name: eventData.participant_name || `Participant ${eventData.participant_id}`,
                avatarSeed: eventData.avatar_seed || null,
                isAnonymous: eventData.is_anonymous || false,
                isAdmin: eventData.is_admin || false,
                joinedAt: new Date(),
                lastActive: new Date(),
              };
              
              setParticipants(prev => [...prev, participantInfo]);
            }
          } else if (payload.new?.event_type === 'participant_removed') {
            // A participant was removed
            const eventData = payload.new.data;
            
            if (eventData?.participant_id) {
              setParticipants(prev => prev.filter(p => p.id !== eventData.participant_id));
            }
          }
        })
        .subscribe(status => {
          console.info(`Participant events channel status: ${status}`);
        });
        
      // Store the events channel reference for cleanup
      participantEventsChannelRef.current = eventsChannel;
    } catch (err) {
      console.error('Error subscribing to participant events:', err);
    }
    
    // Clean up both channel subscriptions on unmount
    return () => {
      try {
        console.info('Participant events channel status:', participantEventsChannelRef.current?.state);
        
        // Only attempt cleanup if there's a valid channel and we haven't already tried
        if (participantsChannelRef.current && !cleanupAttemptedRef.current.participants) {
          const channel = participantsChannelRef.current;
          participantsChannelRef.current = null; // Clear ref first
          cleanupAttemptedRef.current.participants = true;
          supabase.removeChannel(channel);
        }
      } catch (err) {
        console.error('Error cleaning up participants channel:', err);
        // Ensure ref is cleared
        participantsChannelRef.current = null;
      }
      
      try {
        console.info('Participant events channel status:', participantEventsChannelRef.current?.state);
        
        // Only attempt cleanup if there's a valid channel and we haven't already tried
        if (participantEventsChannelRef.current && !cleanupAttemptedRef.current.events) {
          const eventsChannel = participantEventsChannelRef.current;
          participantEventsChannelRef.current = null; // Clear ref first
          cleanupAttemptedRef.current.events = true;
          supabase.removeChannel(eventsChannel);
        }
      } catch (err) {
        console.error('Error cleaning up participant events channel:', err);
        // Ensure ref is cleared
        participantEventsChannelRef.current = null;
      }
    };
  }, [currentConversationId, participants]);
  
  return { participants, setParticipants, isLoading };
}
