
import React from 'react';
import { Message, ParticipantInfo } from "@/types/chat";
import { useMessageAvatarProcessor } from './messages/useMessageAvatarProcessor';
import { useMessageGrouping } from './messages/useMessageGrouping';
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
  const { processMessageAvatar } = useMessageAvatarProcessor();
  const { groupMessages } = useMessageGrouping();

  return React.useMemo(() => {
    // No messages to process
    if (!messages || messages.length === 0) {
      return [];
    }
    
    debugLog('all', `Processing ${messages.length} messages in ${viewMode} mode for participant ${currentParticipant}`);
    
    // Map participants to their IDs for quicker lookup
    const participantMap = participants.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as { [key: number]: ParticipantInfo });

    // Process each message to ensure correct avatar and participant info
    const processedMessages = messages.map(message => {
      // Store original participant key for filtering
      const originalParticipant = message.participant;
      
      const { processedAvatar, isAnonymous, displayName } = processMessageAvatar(
        message,
        message.participant ? participantMap[parseInt(message.participant.slice(1))] : null,
        currentParticipant
      );

      return {
        ...message,
        avatar: processedAvatar,
        isAnonymous,
        displayName, // Store display name separately
        participant: originalParticipant // Keep original participant key for filtering
      };
    });

    // For participant mode, filter messages using the original participant key
    if (viewMode === "participant") {
      const participantKey = `P${currentParticipant}`;
      debugLog('all', `Filtering messages for participant key: ${participantKey}`);
      
      const filteredMessages = processedMessages.filter(message => {
        const isAssistantMessage = message.sender === "assistant";
        const isCurrentParticipantMessage = message.sender === "user" && message.participant === participantKey;
        const isAdminMessage = message.sender === "admin";
        
        debugLog('all', `Message ${message.id}: sender=${message.sender}, participant=${message.participant}, include=${isAssistantMessage || isCurrentParticipantMessage || isAdminMessage}`);
        
        return isAssistantMessage || isCurrentParticipantMessage || isAdminMessage;
      });
      
      debugLog('all', `Filtered ${filteredMessages.length} messages from ${processedMessages.length} total for participant view`);
      return filteredMessages;
    }

    // For admin mode, return all processed messages
    debugLog('all', `Returning all ${processedMessages.length} messages for admin view`);
    return processedMessages;
  }, [messages, viewMode, participants, participantNames, currentParticipant, processMessageAvatar, groupMessages]);
};
