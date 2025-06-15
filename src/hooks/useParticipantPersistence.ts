
import { useState, useEffect } from "react";

export interface ParticipantSessionData {
  participantId: number;
  conversationId: number;
  name: string;
  avatarSeed: string;
  isAnonymous: boolean;
  isAdmin?: boolean; // Keep for backward compatibility
  isHost?: boolean; // New host property
  timestamp: string;
  lastAccessedAt: string;
}

const PARTICIPANT_STORAGE_KEY = 'participantSessionData';

export function useParticipantPersistence() {
  const [participantData, setParticipantData] = useState<ParticipantSessionData | null>(null);

  const persistParticipantData = (data: Omit<ParticipantSessionData, 'timestamp' | 'lastAccessedAt'>) => {
    const sessionData: ParticipantSessionData = {
      ...data,
      timestamp: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };
    
    try {
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(sessionData));
      setParticipantData(sessionData);
      console.log('Participant data persisted:', sessionData);
    } catch (error) {
      console.error('Failed to persist participant data:', error);
    }
  };

  const loadParticipantData = (conversationId?: number): ParticipantSessionData | null => {
    try {
      const stored = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
      if (!stored) return null;

      const data: ParticipantSessionData = JSON.parse(stored);
      
      // Update last accessed time
      const updatedData = {
        ...data,
        lastAccessedAt: new Date().toISOString()
      };
      
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(updatedData));
      
      // If conversationId is provided, only return data for that conversation
      if (conversationId && data.conversationId !== conversationId) {
        return null;
      }
      
      setParticipantData(updatedData);
      return updatedData;
    } catch (error) {
      console.error('Failed to load participant data:', error);
      return null;
    }
  };

  const getSessionByConversationId = (conversationId: number): ParticipantSessionData | null => {
    return loadParticipantData(conversationId);
  };

  const updateSessionAccessTime = (conversationId: number) => {
    const sessionData = getSessionByConversationId(conversationId);
    if (sessionData) {
      const updatedData = {
        ...sessionData,
        lastAccessedAt: new Date().toISOString()
      };
      
      try {
        localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(updatedData));
        setParticipantData(updatedData);
      } catch (error) {
        console.error('Failed to update session access time:', error);
      }
    }
  };

  const clearParticipantData = () => {
    try {
      localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
      setParticipantData(null);
      console.log('Participant data cleared');
    } catch (error) {
      console.error('Failed to clear participant data:', error);
    }
  };

  const updateLastAccessed = () => {
    if (participantData) {
      const updatedData = {
        ...participantData,
        lastAccessedAt: new Date().toISOString()
      };
      
      try {
        localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(updatedData));
        setParticipantData(updatedData);
      } catch (error) {
        console.error('Failed to update last accessed time:', error);
      }
    }
  };

  // Load participant data on mount
  useEffect(() => {
    loadParticipantData();
  }, []);

  return {
    participantData,
    persistedParticipantData: participantData, // Alias for compatibility
    persistParticipantData,
    loadParticipantData,
    getSessionByConversationId,
    updateSessionAccessTime,
    clearParticipantData,
    updateLastAccessed
  };
}
