/**
 * use Participant Persistence
 *
 * Hook for the AIfacilitator application.
 *
 * Participant session data is stored under a session-scoped key:
 *   participantSessionData_{conversationId}
 *
 * This prevents cross-session data bleed when a host tests multiple
 * participant flows in the same browser — each session has its own
 * isolated slot in localStorage.
 */

import { useState, useEffect, useCallback } from "react";
import { participantDataKey } from "@/lib/api";

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

/**
 * Pure read function - does NOT update state or localStorage.
 * Safe to call during render (e.g., inside useMemo).
 *
 * Reads from the scoped key `participantSessionData_{conversationId}`.
 * Falls back to the legacy flat key `participantSessionData` for users
 * upgrading from an older build.
 */
function readSessionFromStorage(conversationId?: number): ParticipantSessionData | null {
  try {
    // Try the scoped key first.
    const scopedKey = conversationId
      ? participantDataKey(String(conversationId))
      : participantDataKey();

    let stored = localStorage.getItem(scopedKey);

    // Fall back to legacy flat key when the scoped key is empty.
    if (!stored && conversationId) {
      stored = localStorage.getItem('participantSessionData');
    }

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

    // Store under the scoped key so it cannot collide with other sessions.
    const key = participantDataKey(String(data.conversationId));

    try {
      localStorage.setItem(key, JSON.stringify(sessionData));
      setParticipantData(sessionData);
    } catch (error) {
      console.error('Failed to persist participant data:', error);
    }
  }, []);

  const loadParticipantData = useCallback((conversationId?: number): ParticipantSessionData | null => {
    try {
      const key = conversationId
        ? participantDataKey(String(conversationId))
        : participantDataKey();

      let stored = localStorage.getItem(key);

      // Fall back to legacy flat key for users upgrading from an older build.
      if (!stored) {
        stored = localStorage.getItem('participantSessionData');
      }

      if (!stored) return null;

      const data: ParticipantSessionData = JSON.parse(stored);

      // Update last accessed time
      const updatedData = {
        ...data,
        lastAccessedAt: new Date().toISOString()
      };

      // Write back to the scoped key (migrates legacy data on first access).
      const scopedKey = participantDataKey(String(data.conversationId));
      localStorage.setItem(scopedKey, JSON.stringify(updatedData));

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

      const key = participantDataKey(String(conversationId));
      try {
        localStorage.setItem(key, JSON.stringify(updatedData));
        setParticipantData(updatedData);
      } catch (error) {
        console.error('Failed to update session access time:', error);
      }
    }
  }, []);

  const clearParticipantData = useCallback((conversationId?: number) => {
    try {
      if (conversationId) {
        localStorage.removeItem(participantDataKey(String(conversationId)));
      } else {
        // Clear all scoped keys + legacy key.
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('participantSessionData')) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
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

      const key = participantDataKey(String(participantData.conversationId));
      try {
        localStorage.setItem(key, JSON.stringify(updatedData));
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
