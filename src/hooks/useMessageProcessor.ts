import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import { getFacilitatorAvatarUrl, isImageUrl } from "@/utils/facilitatorUtils";
import { debugLog } from "@/utils/debugLogger";

interface UseMessageProcessorProps {
  messages: Message[];
  viewMode: "participant" | "admin";
  participants: ParticipantInfo[];
  participantNames: { [key: number]: string };
  currentParticipant: number;
}

export const useMessageProcessor = ({
  messages,
  viewMode,
  participants,
  participantNames,
  currentParticipant
}: UseMessageProcessorProps) => {
  return React.useMemo(() => {
    // No messages to process
    if (!messages || messages.length === 0) {
      return [];
    }
    
    // Create a mapping of participant IDs to names for quicker lookup
    const participantMap = participants.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as { [key: number]: ParticipantInfo });
    
    // Process facilitator avatar URLs to ensure they're correctly formatted
    const processedMessages = [...messages].map(message => {
      // For assistant/facilitator messages, ensure avatar URL is correct
      if (message.sender === "assistant") {
        // Fix any URL issues with facilitator avatars
        let correctedAvatar = message.avatar;
        
        if (correctedAvatar && isImageUrl(correctedAvatar)) {
          // We'll handle URL normalization asynchronously later if needed
          debugLog('all', `Facilitator avatar in message processor: ${correctedAvatar}`);
        } else if (!correctedAvatar || correctedAvatar === '/placeholder.svg') {
          // If no avatar or invalid image URL, provide a better default
          correctedAvatar = `/api/avatar?name=Facilitator&variant=beam&palette=2`;
          debugLog('all', `Using default facilitator avatar for message`);
        }
        
        return {
          ...message,
          avatar: correctedAvatar
        };
      }
      return message;
    });
    
    if (viewMode === "admin") {
      // Admin sees all messages
      return processedMessages.map(message => {
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          
          // First priority: Look for participant in the participants array (from db)
          const participant = participantMap[participantNumber];
          if (participant) {
            return {
              ...message,
              participant: participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.isAnonymous
            };
          }
          
          // Second priority: Check participantNames dictionary
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: name
            };
          }
          
          // Fallback: Use participant number as a last resort
          return {
            ...message,
            participant: `Participant ${participantNumber}`
          };
        }
        return message;
      });
    } else {
      // Participant mode - filter messages strictly to only show:
      // 1. Messages from the facilitator (assistant)
      // 2. Messages from this specific participant
      const participantKey = `P${currentParticipant}`;
      
      // Filter to only include facilitator messages and this participant's messages
      const filteredMessages = processedMessages.filter(message => {
        // Include all facilitator messages
        if (message.sender === "assistant") {
          return true;
        }
        
        // Include only this participant's messages
        if (message.sender === "user" && message.participant === participantKey) {
          return true;
        }
        
        // Exclude all other participant messages
        return false;
      });
      
      // Log the filtered messages for debugging
      debugLog('all', `Participant view filtered messages: ${filteredMessages.length} out of ${messages.length}`);
      
      // Process the filtered messages
      return filteredMessages.map(message => {
        // For assistant/facilitator messages, ensure avatar URL is correct
        if (message.sender === "assistant") {
          let correctedAvatar = message.avatar;
          
          if (!correctedAvatar || !isImageUrl(correctedAvatar)) {
            correctedAvatar = `/api/avatar?name=Facilitator&variant=beam&palette=2`;
            debugLog('all', `Using default facilitator avatar for message in participant view`);
          }
          
          return {
            ...message,
            avatar: correctedAvatar
          };
        }
        
        // Special handling for participant messages
        if (message.sender === "user" && message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          
          // First priority: Check participants array for database info
          const participant = participantMap[participantNumber];
          if (participant) {
            return {
              ...message,
              participant: participantNumber === currentParticipant ? "You" : participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.isAnonymous
            };
          }
          
          // Second priority: Check participantNames dictionary
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: participantNumber === currentParticipant ? "You" : name
            };
          }
          
          // Fallback: Use "You" for current participant
          return {
            ...message,
            participant: participantNumber === currentParticipant ? "You" : `Participant ${participantNumber}`
          };
        }
        
        return message;
      });
    }
  }, [messages, viewMode, participants, participantNames, currentParticipant]);
};
