
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { networkManager } from '@/utils/networkManager';
import { ParticipantInfo, Message } from '@/types/chat';
import { ConversationWithSession } from '@/types/database';
import { getParticipantInfo } from '@/utils/participantUtils';

interface UseCoordinatedSessionDataProps {
  conversationId: number | null;
  isAdmin?: boolean;
}

interface SessionDataState {
  conversation: ConversationWithSession | null;
  participants: ParticipantInfo[];
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  connectionHealthy: boolean;
}

export const useCoordinatedSessionData = ({ 
  conversationId, 
  isAdmin = false 
}: UseCoordinatedSessionDataProps) => {
  const [state, setState] = useState<SessionDataState>({
    conversation: null,
    participants: [],
    messages: [],
    isLoading: true,
    error: null,
    connectionHealthy: true
  });

  const mountedRef = useRef(true);
  const lastSuccessfulFetch = useRef<number>(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateState = useCallback((updates: Partial<SessionDataState>) => {
    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const fetchConversationData = useCallback(async () => {
    if (!conversationId) return null;

    const cacheKey = `conversation_${conversationId}`;
    
    try {
      const result = await networkManager.fetchWithCache(
        'conversations',
        supabase
          .from('conversations')
          .select(`
            *,
            participants,
            participant_description,
            language,
            sessions!conversations_sessions_id_fkey(
              id,
              title,
              objective,
              welcome_message,
              session_type,
              facilitator,
              facilitator_details:facilitators!sessions_facilitator_fkey(
                id,
                title,
                profile_picture,
                details,
                description,
                expertise_level,
                specialties,
                languages
              )
            )
          `)
          .eq('id', conversationId)
          .single(),
        cacheKey
      );

      return result.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }, [conversationId]);

  const fetchParticipants = useCallback(async () => {
    if (!conversationId) return [];

    const cacheKey = `participants_${conversationId}`;
    
    try {
      const result = await networkManager.fetchWithCache(
        'session_participants',
        supabase
          .from('session_participants')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        cacheKey
      );

      if (!result.data || result.data.length === 0) {
        return [];
      }

      const participantPromises = result.data.map(async (participant) => {
        try {
          return await getParticipantInfo(participant);
        } catch (err) {
          console.error('Error getting participant info:', err);
          return null;
        }
      });

      const participantInfos = (await Promise.all(participantPromises))
        .filter(Boolean) as ParticipantInfo[];
      
      return participantInfos;
    } catch (error) {
      console.error('Error fetching participants:', error);
      throw error;
    }
  }, [conversationId]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) return [];

    const cacheKey = `messages_${conversationId}`;
    
    try {
      const result = await networkManager.fetchWithCache(
        'messages',
        supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
        cacheKey
      );

      if (!result.data) return [];

      // Convert database messages to Message format
      const messages: Message[] = result.data.map(msg => ({
        id: msg.id.toString(),
        content: msg.content,
        sender: msg.role === 'assistant' ? 'assistant' : 'user',
        timestamp: new Date(msg.created_at),
        participant: msg.participant_id ? `P${msg.participant_id}` : undefined
      }));

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }, [conversationId]);

  const loadAllData = useCallback(async () => {
    if (!conversationId || !mountedRef.current) return;

    updateState({ isLoading: true, error: null });

    try {
      console.log(`🔄 Loading coordinated data for conversation ${conversationId}`);
      
      // Fetch all data in parallel with coordinated caching
      const [conversationData, participantsData, messagesData] = await Promise.all([
        fetchConversationData(),
        fetchParticipants(),
        fetchMessages()
      ]);

      if (!mountedRef.current) return;

      console.log(`✅ Successfully loaded data:`, {
        conversation: !!conversationData,
        participants: participantsData.length,
        messages: messagesData.length
      });

      updateState({
        conversation: conversationData,
        participants: participantsData,
        messages: messagesData,
        isLoading: false,
        connectionHealthy: true
      });

      lastSuccessfulFetch.current = Date.now();

    } catch (error) {
      console.error('❌ Error loading session data:', error);
      
      if (!mountedRef.current) return;
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session data';
      
      updateState({
        error: errorMessage,
        isLoading: false,
        connectionHealthy: false
      });
    }
  }, [conversationId, fetchConversationData, fetchParticipants, fetchMessages, updateState]);

  // Initial load
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Clear cache when conversation changes
  useEffect(() => {
    if (conversationId) {
      networkManager.clearCache(`_${conversationId}`);
    }
  }, [conversationId]);

  const refetch = useCallback(() => {
    console.log('🔄 Refetching session data...');
    if (conversationId) {
      networkManager.clearCache(`_${conversationId}`);
    }
    loadAllData();
  }, [conversationId, loadAllData]);

  return {
    ...state,
    refetch,
    lastSuccessfulFetch: lastSuccessfulFetch.current
  };
};
