
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";

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
    
    // Log the inputs for debugging
    console.log(`useMessageProcessor - Processing ${messages.length} messages in ${viewMode} mode for participant ${currentParticipant}`);
    
    if (viewMode === "admin") {
      // Admin sees all messages
      return messages.map(message => {
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          const participant = participants.find(p => p.id === participantNumber);
          
          // Add participant details
          if (participant) {
            return {
              ...message,
              participant: participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.is_anonymous
            };
          }
          
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: name
            };
          }
          return {
            ...message,
            participant: `Participant ${participantNumber}`
          };
        }
        return message;
      });
    } else {
      // Participant mode - filter messages for this participant
      const participantKey = `P${currentParticipant}`;
      
      // Filter to only include facilitator messages and this participant's messages
      const filteredMessages = messages.filter(message => {
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
        // Process the message the same way as in admin view
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          const participant = participants.find(p => p.id === participantNumber);
          
          if (participant) {
            return {
              ...message,
              participant: participant.name,
              avatar: participant.avatar,
              isAnonymous: participant.is_anonymous
            };
          }
          
          const name = participantNames[participantNumber];
          if (name) {
            return {
              ...message,
              participant: name
            };
          }
          return {
            ...message,
            participant: `You`  // In participant view, show own messages as "You"
          };
        }
        return message;
      });
    }
  }, [messages, viewMode, participants, participantNames, currentParticipant]);
};
