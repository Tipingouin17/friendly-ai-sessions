
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
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
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

      return (result as any).data;
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

      const resultData = (result as any).data;
      if (!resultData || resultData.length === 0) {
        return [];
      }

      const participantPromises = resultData.map(async (participant: any) => {
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

      const resultData = (result as any).data;
      if (!resultData) return [];

      // Enhanced message processing with consistent content extraction
      const messages: Message[] = resultData.map((msg: any) => {
        let messageContent = '';
        let avatarUrl = undefined;
        
        // Handle different content formats consistently
        if (typeof msg.content === 'string') {
          messageContent = msg.content;
        } else if (msg.content && typeof msg.content === 'object') {
          // Extract text content from object
          if (msg.content.text) {
            messageContent = msg.content.text;
          } else if (typeof msg.content === 'object' && Object.keys(msg.content).length > 0) {
            // Fallback: stringify if it's a non-empty object without text property
            messageContent = JSON.stringify(msg.content);
          }
          
          // Extract avatar if present
          if (msg.content.avatar) {
            avatarUrl = msg.content.avatar;
          }
        }

        // Skip messages without content
        if (!messageContent || messageContent.trim() === '') {
          return null;
        }

        return {
          id: msg.id.toString(),
          content: messageContent,
          sender: msg.role === 'assistant' ? 'assistant' : msg.role === 'admin' ? 'admin' : 'user',
          timestamp: new Date(msg.created_at),
          participant: msg.participant_id ? `P${msg.participant_id}` : undefined,
          avatar: avatarUrl
        } as Message;
      }).filter(Boolean); // Remove null messages

      return messages;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }, [conversationId]);

  const loadAllData = useCallback(async (forceRefresh = false) => {
    if (!conversationId || !mountedRef.current) return;

    updateState({ isLoading: true, error: null });

    try {
      console.log(`🔄 Loading coordinated data for conversation ${conversationId}${forceRefresh ? ' (forced refresh)' : ''}`);
      
      // Clear cache if force refresh
      if (forceRefresh) {
        networkManager.clearCache(`_${conversationId}`);
      }
      
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
        messages: messagesData.length,
        forceRefresh
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
    console.log('🔄 Refetching session data with force refresh...');
    loadAllData(true);
  }, [loadAllData]);

  const refetchMessages = useCallback(() => {
    console.log('🔄 Quick refetch of messages only...');
    
    // Clear message cache and refetch immediately
    if (conversationId) {
      networkManager.clearCache(`messages_${conversationId}`);
      
      // Set a short timeout to avoid overwhelming the database
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
      
      fetchTimeoutRef.current = setTimeout(() => {
        loadAllData(false);
      }, 100);
    }
  }, [conversationId, loadAllData]);

  return {
    ...state,
    refetch,
    refetchMessages,
    lastSuccessfulFetch: lastSuccessfulFetch.current
  };
};
