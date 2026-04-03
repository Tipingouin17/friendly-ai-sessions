/**
 * use Join Session Navigation
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useJoinSessionNavigation = () => {
  const navigate = useNavigate();
  
  // Use ref to prevent multiple navigation attempts and processing
  const hasNavigated = useRef(false);
  const hasProcessedJoin = useRef(false);
  const isNavigatingRef = useRef(false);
  
  const navigateToSession = useCallback((conversationId: number, participantName: string, participantId: number, avatarSeed: string) => {
    // Set navigation flags immediately to prevent any further processing
    isNavigatingRef.current = true;
    hasNavigated.current = true;
    
    // Navigate immediately and synchronously
    const navigationPath = `/session?id=${conversationId}&name=${encodeURIComponent(participantName)}&participantId=${participantId}&avatarSeed=${encodeURIComponent(avatarSeed)}`;
    
    // Use replace to prevent back navigation issues
    navigate(navigationPath, { replace: true });
  }, [navigate]);
  
  const resetNavigationFlags = useCallback(() => {
    hasNavigated.current = false;
    isNavigatingRef.current = false;
    hasProcessedJoin.current = false;
  }, []);
  
  const checkNavigationState = useCallback(() => {
    return hasNavigated.current || isNavigatingRef.current;
  }, []);
  
  return {
    hasNavigated,
    hasProcessedJoin,
    isNavigatingRef,
    navigateToSession,
    resetNavigationFlags,
    checkNavigationState
  };
};
