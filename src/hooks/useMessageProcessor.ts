
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
            participant: `Anonymous ${participantNumber}`
          };
        }
        return message;
      });
    } else {
      // Participant mode - more verbose logging for debugging
      console.log("Participant messages before filtering:", messages);
      
      // Filter to only include facilitator messages and this participant's messages
      const filteredMessages = messages.filter(message => {
        // Include all facilitator messages
        if (message.sender === "assistant") {
          console.log("Including assistant message:", message);
          return true;
        }
        
        // Include only this participant's messages
        const isCurrentParticipant = message.participant === `P${currentParticipant}`;
        console.log(`Message from ${message.participant}, current is P${currentParticipant}, include: ${isCurrentParticipant}`);
        
        if (isCurrentParticipant) {
          return true;
        }
        
        // Exclude all other participant messages
        return false;
      });
      
      console.log("Filtered messages for participant view:", filteredMessages);
      
      // Process the filtered messages
      return filteredMessages.map(message => {
        // Process the message the same way
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
            participant: `Anonymous ${participantNumber}`
          };
        }
        return message;
      });
    }
  }, [messages, viewMode, participants, participantNames, currentParticipant]);
};
