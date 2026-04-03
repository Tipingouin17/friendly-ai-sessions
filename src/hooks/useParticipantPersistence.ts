/**
 * use Participant Persistence
 *
 * Hook for the AIfacilitator application.
 */

import { useState, useEffect, useCallback } from "react";

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

/**
 * Pure read function - does NOT update state or localStorage.
 * Safe to call during render (e.g., inside useMemo).
 */
function readSessionFromStorage(conversationId?: number): ParticipantSessionData | null {
  try {
    const stored = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
    if (!stored) return null;
    const data: ParticipantSessionData = JSON.parse(stored);
    if (conversationId && data.conversationId !== conversationId) {
      return null;
    }
    return data;
  } catch (error) {
    console.error('Failed to read participant data:', error);
    return null;
  }
}

export function useParticipantPersistence() {
  const [participantData, setParticipantData] = useState<ParticipantSessionData | null>(null);

  const persistParticipantData = useCallback((data: Omit<ParticipantSessionData, 'timestamp' | 'lastAccessedAt'>) => {
    const sessionData: ParticipantSessionData = {
      ...data,
      timestamp: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(PARTICIPANT_STORAGE_KEY, JSON.stringify(sessionData));
      setParticipantData(sessionData);
    } catch (error) {
      console.error('Failed to persist participant data:', error);
    }
  }, []);

  const loadParticipantData = useCallback((conversationId?: number): ParticipantSessionData | null => {
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
  }, []);

  /**
   * Pure read-only lookup - safe to call in useMemo or during render.
   * Does NOT trigger state updates or localStorage writes.
   */
  const getSessionByConversationId = useCallback((conversationId: number): ParticipantSessionData | null => {
    return readSessionFromStorage(conversationId);
  }, []);

  const updateSessionAccessTime = useCallback((conversationId: number) => {
    const sessionData = readSessionFromStorage(conversationId);
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
  }, []);

  const clearParticipantData = useCallback(() => {
    try {
      localStorage.removeItem(PARTICIPANT_STORAGE_KEY);
      setParticipantData(null);
    } catch (error) {
      console.error('Failed to clear participant data:', error);
    }
  }, []);

  const updateLastAccessed = useCallback(() => {
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
  }, [participantData]);

  // Load participant data on mount
  useEffect(() => {
    loadParticipantData();
  }, [loadParticipantData]);

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
