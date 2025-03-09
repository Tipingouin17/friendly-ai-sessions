
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
      // Participant only sees facilitator messages and their own responses
      return messages.filter(message => {
        // Include all facilitator messages
        if (message.sender === "assistant") return true;
        
        // Include only this participant's messages
        if (message.participant === `P${currentParticipant}`) return true;
        
        // Exclude all other participant messages
        return false;
      }).map(message => {
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
