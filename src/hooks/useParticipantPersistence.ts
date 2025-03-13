
import { useEffect, useState } from 'react';

type ParticipantSessionData = {
  participantId: number;
  conversationId: number;
  name?: string;
  avatarSeed?: string;
  isAnonymous?: boolean;
  isAdmin?: boolean;
  timestamp: number;
};

const STORAGE_KEY = 'participant_session';

export function useParticipantPersistence() {
  const [persistedData, setPersistedData] = useState<ParticipantSessionData | null>(null);

  // Load persisted data on mount
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsedData = JSON.parse(storedData) as ParticipantSessionData;
        
        // Check if the data is still valid (less than 24 hours old)
        const isValid = Date.now() - parsedData.timestamp < 24 * 60 * 60 * 1000;
        
        if (isValid) {
          console.log('Loaded persisted participant data:', parsedData);
          setPersistedData(parsedData);
        } else {
          console.log('Persisted participant data expired, clearing');
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading persisted participant data:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Store participant data
  const persistParticipantData = (data: Omit<ParticipantSessionData, 'timestamp'>) => {
    try {
      const dataToStore: ParticipantSessionData = {
        ...data,
        timestamp: Date.now()
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      console.log('Persisted participant data:', dataToStore);
      setPersistedData(dataToStore);
    } catch (error) {
      console.error('Error persisting participant data:', error);
    }
  };

  // Clear stored data
  const clearPersistedData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPersistedData(null);
  };

  return {
    persistedParticipantData: persistedData,
    persistParticipantData,
    clearPersistedData,
    hasPersistedData: !!persistedData
  };
}
