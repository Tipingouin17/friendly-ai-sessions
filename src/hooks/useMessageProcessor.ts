
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
    console.log("Available participants data:", participants);
    
    // Create a mapping of participant IDs to names for quicker lookup
    const participantMap = participants.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as { [key: number]: ParticipantInfo });
    
    if (viewMode === "admin") {
      // Admin sees all messages
      return messages.map(message => {
        if (message.participant && message.participant.startsWith('P')) {
          const participantNumber = parseInt(message.participant.slice(1));
          
          // First priority: Look for participant in the participants array (from db)
          const participant = participantMap[participantNumber];
          if (participant) {
            console.log(`Found participant in map: ${participant.name} for ID ${participantNumber}`);
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
            console.log(`Found participant in names map: ${name} for ID ${participantNumber}`);
            return {
              ...message,
              participant: name
            };
          }
          
          // Fallback: Use participant number
          console.log(`No participant info found for ID ${participantNumber}, using default`);
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
