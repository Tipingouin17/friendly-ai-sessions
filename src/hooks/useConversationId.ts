
import { useLocation } from "react-router-dom";
import { useParticipantPersistence } from "./useParticipantPersistence";
import { useMemo, useRef } from "react";

export interface LocationStateType {
  conversationId?: number;
  participantId?: number;
  isGuest?: boolean;
  participantName?: string;
  showMessaging?: boolean;
  isAdmin?: boolean;
  newConversationId?: number; // Add support for this field that might be passed
  avatarSeed?: string; // Added this property to fix the type error
}

export const useConversationId = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const idFromParams = searchParams.get('id') || searchParams.get('conversationId');

  // Location state type
  const locationState = location.state as LocationStateType | null;

  // Get persisted participant data
  const { persistedParticipantData, getSessionByConversationId, updateSessionAccessTime } = useParticipantPersistence();

  // Track processed data with ref to avoid re-processing on every render
  const processedDataRef = useRef<{
    id: number | null;
    state: LocationStateType | null;
    persistedData: any | null;
  } | null>(null);

  // Memoize calculation of conversation ID and persisted session data
  return useMemo(() => {
    // Skip re-processing if we already have the same inputs
    if (processedDataRef.current &&
      ((idFromParams && processedDataRef.current.id === parseInt(idFromParams, 10)) ||
        (locationState?.conversationId && processedDataRef.current.id === locationState.conversationId) ||
        (locationState?.newConversationId && processedDataRef.current.id === locationState.newConversationId) ||
        (persistedParticipantData?.conversationId && processedDataRef.current.id === persistedParticipantData.conversationId))) {
      return {
        currentConversationId: processedDataRef.current.id,
        locationState: processedDataRef.current.state,
        persistedSessionData: processedDataRef.current.persistedData
      };
    }

    let currentConversationId: number | null = null;
    let persistedSessionData = null;

    // First check if ID is in URL params
    if (idFromParams) {
      //console.log("Found conversation ID in URL params:", idFromParams);
      currentConversationId = parseInt(idFromParams, 10);

      // Check if we have persisted data for this conversation ID
      persistedSessionData = getSessionByConversationId(currentConversationId);

      // Update the last accessed time for this session
      if (persistedSessionData) {
        updateSessionAccessTime(currentConversationId);
        //console.log("Found persisted data for conversation ID:", currentConversationId, persistedSessionData);
      }
    }
    // Then check location state.conversationId
    else if (locationState?.conversationId) {
      //console.log("Found conversation ID in state.conversationId:", locationState.conversationId);
      currentConversationId = locationState.conversationId;
    }
    // Also check location state.newConversationId which might be used
    else if (locationState?.newConversationId) {
      currentConversationId = locationState.newConversationId;
    }
    // Finally, check persisted data
    else if (persistedParticipantData?.conversationId) {
      //console.log("Found conversation ID in persisted data:", persistedParticipantData.conversationId);
      currentConversationId = persistedParticipantData.conversationId;
      persistedSessionData = persistedParticipantData;
    }

    //console.log("useConversationId determined ID:", currentConversationId);

    // If we have persisted data, enhance the location state with it
    let enhancedLocationState = locationState;
    if (persistedSessionData && (!locationState?.participantId || !locationState?.participantName)) {
      enhancedLocationState = {
        ...locationState,
        participantId: persistedSessionData.participantId,
        isGuest: true,
        participantName: persistedSessionData.name,
        avatarSeed: persistedSessionData.avatarSeed,
        isAdmin: persistedSessionData.isAdmin
      };
      //console.log("Enhanced location state with persisted data:", enhancedLocationState);
    }

    // Store the processed data for future reference
    processedDataRef.current = {
      id: currentConversationId,
      state: enhancedLocationState,
      persistedData: persistedSessionData
    };

    return {
      currentConversationId,
      locationState: enhancedLocationState,
      persistedSessionData
    };
  }, [idFromParams, locationState, persistedParticipantData, getSessionByConversationId, updateSessionAccessTime]);
};
