
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

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
        
        if (correctedAvatar) {
          // Fix incorrect bucket name if present
          if (correctedAvatar.includes('facilitators-avatars')) {
            correctedAvatar = correctedAvatar.replace('facilitators-avatars', 'facilitator-avatars');
          }
          
          // Fix double slashes in the URL (except after protocol)
          correctedAvatar = correctedAvatar.replace(/([^:]\/)\/+/g, "$1");
        } else {
          // If no avatar, provide a default
          correctedAvatar = `/api/avatar?name=Facilitator&variant=beam&palette=2`;
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
      // Participant mode - IMPORTANT: filter messages strictly to only show:
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
      
      // Process the filtered messages
      return filteredMessages.map(message => {
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
