
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { useParticipantDatabase } from "./useParticipantDatabase";
import { useParticipantRealtime } from "./useParticipantRealtime";
import { useGuestParticipant } from "./useGuestParticipant";

export function useParticipantTracking(
  conversationState: { participantName?: string; avatarSeed?: string; isGuest?: boolean; participantId?: number } | null,
  conversation: ConversationWithSession | null,
  conversationId?: number | null
) {
  // Use the database hook to fetch participants
  const { 
    participants: dbParticipants, 
    setParticipants, 
    isLoading: dbIsLoading 
  } = useParticipantDatabase(conversationId);
  
  // State for loading
  const [isLoading, setIsLoading] = useState(true);

  // Update loading state based on database loading
  useEffect(() => {
    setIsLoading(dbIsLoading);
  }, [dbIsLoading]);
  
  // Use the realtime hook to subscribe to participant updates
  useParticipantRealtime({
    conversationId,
    participants: dbParticipants,
    setParticipants,
    setIsLoading
  });
  
  // Use the guest participant hook to handle guest joining
  useGuestParticipant({
    locationState: conversationState,
    setParticipants
  });
  
  // Log the current participants array for debugging
  useEffect(() => {
    console.log("Current participants array:", dbParticipants);
    // Return an empty cleanup function
    return () => {};
  }, [dbParticipants]);
  
  return {
    participants: dbParticipants,
    setParticipants,
    isLoading
  };
}
