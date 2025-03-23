
import { useEffect, useState } from 'react';

type ParticipantSessionData = {
  participantId: number;
  conversationId: number;
  name?: string;
  avatarSeed?: string;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  timestamp: number;
  // Track when the participant last accessed the session
  lastAccessedAt: number;
};

const STORAGE_KEY = 'participant_session';
// Store up to 5 recent sessions
const RECENT_SESSIONS_KEY = 'recent_participant_sessions';
const MAX_RECENT_SESSIONS = 5;

export function useParticipantPersistence() {
  const [persistedData, setPersistedData] = useState<ParticipantSessionData | null>(null);
  const [recentSessions, setRecentSessions] = useState<ParticipantSessionData[]>([]);

  // Load persisted data on mount
  useEffect(() => {
    try {
      // Load current session data
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as ParticipantSessionData;
        
        // Check if the data is still valid (less than 24 hours old)
        const isValid = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
        
        if (isValid) {
          //console.log('Loaded persisted participant data:', parsedData);
          setPersistedData(parsedData);
        } else {
          console.log('Persisted participant data expired, clearing');
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      // Load recent sessions
      const storedRecentSessions = localStorage.getItem(RECENT_SESSIONS_KEY);
      if (storedRecentSessions) {
        const parsedRecentSessions = JSON.parse(storedRecentSessions) as ParticipantSessionData[];
        
        // Filter out expired sessions (older than 7 days)
        const validRecentSessions = parsedRecentSessions.filter(
          session => Date.now() - session.timestamp < 7 * 24 * 60 * 60 * 1000
        );
        
        setRecentSessions(validRecentSessions);
      }
    } catch (error) {
      //console.error('Error loading persisted participant data:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Store participant data
  const persistParticipantData = (data: Omit<ParticipantSessionData, 'timestamp' | 'lastAccessedAt'>) => {
    try {
      const now = Date.now();
      const dataToStore: ParticipantSessionData = {
        ...data,
        timestamp: now,
        lastAccessedAt: now
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      //console.log('Persisted participant data:', dataToStore);
      setPersistedData(dataToStore);
      
      // Update recent sessions
      updateRecentSessions(dataToStore);
    } catch (error) {
      console.error('Error persisting participant data:', error);
    }
  };

  // Update the list of recent sessions
  const updateRecentSessions = (newSession: ParticipantSessionData) => {
    try {
      // Get current recent sessions
      const currentRecentSessions = [...recentSessions];
      
      // Remove this session if it already exists in the list
      const filteredSessions = currentRecentSessions.filter(
        session => session.conversationId !== newSession.conversationId
      );
      
      // Add the new session to the front of the list
      const updatedSessions = [newSession, ...filteredSessions].slice(0, MAX_RECENT_SESSIONS);
      
      // Save to localStorage
      localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updatedSessions));
      setRecentSessions(updatedSessions);
    } catch (error) {
      console.error('Error updating recent sessions:', error);
    }
  };

  // Get a specific session by conversation ID
  const getSessionByConversationId = (conversationId: number): ParticipantSessionData | null => {
    // First check current session
    if (persistedData && persistedData.conversationId === conversationId) {
      return persistedData;
    }
    
    // Then check recent sessions
    const session = recentSessions.find(s => s.conversationId === conversationId);
    return session || null;
  };

  // Update the last accessed timestamp for a session
  const updateSessionAccessTime = (conversationId: number) => {
    if (persistedData && persistedData.conversationId === conversationId) {
      const updatedData = {
        ...persistedData,
        lastAccessedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
      setPersistedData(updatedData);
    }
  };

  // Clear stored data
  const clearPersistedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPersistedData(null);
  };

  // Clear a specific session by conversation ID
  const clearSessionByConversationId = (conversationId: number) => {
    if (persistedData && persistedData.conversationId === conversationId) {
      clearPersistedData();
    }
    
    const updatedRecentSessions = recentSessions.filter(
      session => session.conversationId !== conversationId
    );
    
    localStorage.setItem(RECENT_SESSIONS_KEY, JSON.stringify(updatedRecentSessions));
    setRecentSessions(updatedRecentSessions);
  };

  return {
    persistedParticipantData: persistedData,
    recentSessions,
    persistParticipantData,
    clearPersistedData,
    hasPersistedData: !!persistedData,
    getSessionByConversationId,
    updateSessionAccessTime,
    clearSessionByConversationId
  };
}
