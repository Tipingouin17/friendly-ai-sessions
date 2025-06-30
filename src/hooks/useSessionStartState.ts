
import { useState, useCallback } from 'react';

export const useSessionStartState = () => {
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startProgress, setStartProgress] = useState("Starting session...");

  const startSessionProcess = useCallback(() => {
    setIsStartingSession(true);
    setStartProgress("Starting session...");
  }, []);

  const updateProgress = useCallback((progress: string) => {
    setStartProgress(progress);
  }, []);

  const completeSessionStart = useCallback(() => {
    setIsStartingSession(false);
    setStartProgress("Starting session...");
  }, []);

  return {
    isStartingSession,
    startProgress,
    startSessionProcess,
    updateProgress,
    completeSessionStart
  };
};
