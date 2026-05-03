/**
 * use Join Session Navigation
 *
 * Hook for the AIfacilitator application.
 */

import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJoinToken } from '@/lib/api';

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
    
    // Include the join token in the URL so it survives a cache/localStorage clear.
    // The session page bootstraps the token synchronously from ?token= on first load.
    const joinToken = getJoinToken(String(conversationId));
    const tokenParam = joinToken ? `&token=${encodeURIComponent(joinToken)}` : '';

    const navigationPath = `/session?id=${conversationId}&name=${encodeURIComponent(participantName)}&participantId=${participantId}&avatarSeed=${encodeURIComponent(avatarSeed)}${tokenParam}`;
    
    // Use replace to prevent back navigation issues.
    // Pass participantId and conversationId in location state so that
    // useConversationId picks them up immediately without relying on localStorage.
    navigate(navigationPath, {
      replace: true,
      state: {
        participantName,
        avatarSeed,
        isGuest: true,
        participantId,
        showMessaging: true,
        isAdmin: false,
        conversationId
      }
    });
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
