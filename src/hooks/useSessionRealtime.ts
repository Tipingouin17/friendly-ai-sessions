
import { useState, useEffect } from "react";
import { ParticipantInfo } from "@/types/chat";
import { ConversationWithSession } from "@/types/database";
import { 
  createConversationChannel, 
  createParticipantsChannel, 
  createMessagesChannel,
  removeChannel
} from "@/utils/realtimeConnectionManager";
import { getParticipantInfo } from "@/utils/participantUtils";

type UseSessionRealtimeProps = {
  currentConversationId: number | null;
  participants: ParticipantInfo[];
  setParticipants: React.Dispatch<React.SetStateAction<ParticipantInfo[]>>;
  conversation: ConversationWithSession | null;
  refetch: () => void;
  handleSessionFull?: () => void;
  onSessionStarted?: () => void;
};

export const useSessionRealtime = ({
  currentConversationId,
  participants,
  setParticipants,
  conversation,
  refetch,
  handleSessionFull,
  onSessionStarted
}: UseSessionRealtimeProps) => {
  const [error, setError] = useState<string | null>(null);
  const [sessionStartedCalled, setSessionStartedCalled] = useState(false);
  const [sessionFullCalled, setSessionFullCalled] = useState(false);
  
  // Set up realtime channels
  useEffect(() => {
    if (!currentConversationId) {
      console.log("No conversation ID provided, skipping realtime setup");
      return () => {
        // No cleanup needed in this case
      };
    }

    // Check initial state
    if (conversation) {
      // Check if session is already started
      if (conversation.session_started && !sessionStartedCalled) {
        console.log("Session already started, triggering callback");
        setSessionStartedCalled(true);
        if (onSessionStarted) onSessionStarted();
      }
      
      // Check if session is already full
      if (conversation.current_participants >= (conversation.participants || 0) && 
          (conversation.participants || 0) > 0 && 
          !sessionFullCalled) {
        console.log("Session is already full, triggering callback");
        setSessionFullCalled(true);
        if (handleSessionFull) handleSessionFull();
      }
    }
    
    // Create conversation channel
    let conversationChannel = null;
    let participantsChannel = null;
    let messagesChannel = null;
    
    try {
      conversationChannel = createConversationChannel(
        currentConversationId,
        (payload) => {
          console.log("Conversation update:", payload);
          
          if (payload.new) {
            // Handle session started
            if (payload.new.session_started && !sessionStartedCalled) {
              console.log("Session started detected");
              setSessionStartedCalled(true);
              if (onSessionStarted) onSessionStarted();
            }
            
            // Handle session full
            if (payload.new.current_participants >= (payload.new.participants || 0) && 
                (payload.new.participants || 0) > 0 && 
                !sessionFullCalled) {
              console.log("Session full detected");
              setSessionFullCalled(true);
              if (handleSessionFull) handleSessionFull();
            }
            
            // Refresh data
            refetch();
          }
        }
      );
      
      // Create participants channel
      participantsChannel = createParticipantsChannel(
        currentConversationId,
        async (payload) => {
          console.log("Participant update:", payload);
          
          if (payload.new) {
            // Add new participant if not already in list
            if (!participants.some(p => p.id === payload.new.participant_id)) {
              try {
                const participantInfo = await getParticipantInfo(payload.new);
                
                setParticipants(current => {
                  if (current.some(p => p.id === participantInfo.id)) {
                    return current;
                  }
                  return [...current, participantInfo];
                });
              } catch (error) {
                console.error("Error getting participant info:", error);
                setError("Error retrieving participant information");
              }
            }
          }
        }
      );
      
      // Create messages channel
      messagesChannel = createMessagesChannel(
        currentConversationId,
        (payload) => {
          console.log("Message update:", payload);
          refetch();
        }
      );
    } catch (err) {
      console.error("Error setting up realtime channels:", err);
      setError("Failed to establish realtime connection");
    }
    
    // Cleanup function
    return () => {
      try {
        if (conversationChannel) {
          removeChannel(conversationChannel);
        }
        
        if (participantsChannel) {
          removeChannel(participantsChannel);
        }
        
        if (messagesChannel) {
          removeChannel(messagesChannel);
        }
      } catch (err) {
        console.error("Error removing channels:", err);
      }
    };
  }, [
    currentConversationId, 
    participants, 
    setParticipants, 
    conversation, 
    refetch, 
    handleSessionFull, 
    onSessionStarted, 
    sessionStartedCalled, 
    sessionFullCalled
  ]);
  
  return { error };
};
