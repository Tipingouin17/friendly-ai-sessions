
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
    }, { /* no-op */ } as { [key: number]: ParticipantInfo });

    // Process each message to ensure correct avatar and participant info
    const processedMessages = messages.map(message => {
      // Store original participant key for filtering
      const originalParticipant = message.participant;
      
      const { processedAvatar, isAnonymous, displayName } = processMessageAvatar(
        message,
        message.participant ? participantMap[parseInt(message.participant, 10)] : null,
        currentParticipant
      );

      return {
        ...message,
        avatar: processedAvatar,
        isAnonymous,
        displayName, // Store display name separately
        participant: originalParticipant, // Keep original participant key for filtering
        isQuestionMessage: message.sender === "assistant" && !message.isReport // Mark facilitator questions
      };
    });

    // For participant mode, RLS policies now handle filtering at database level
    // But we still apply client-side filtering as a backup layer
    if (viewMode === "participant") {
      // If currentParticipant is 0, we don't yet know who the current user is.
      // In that case, show all messages (assistant + all user) to avoid a blank screen
      // while participant identity is being resolved asynchronously.
      if (currentParticipant === 0) {
        debugLog('all', `currentParticipant is 0 (unknown), showing all messages`);
        return processedMessages;
      }

      const participantKey = String(currentParticipant);
      debugLog('all', `Applying backup client-side filtering for participant key: ${participantKey}`);
      
      const filteredMessages = processedMessages.filter(message => {
        const isAssistantMessage = message.sender === "assistant";
        const isCurrentParticipantMessage = message.sender === "user" && message.participant === participantKey;
        const isAdminMessage = message.sender === "admin";
        
        debugLog('all', `Message ${message.id}: sender=${message.sender}, participant=${message.participant}, include=${isAssistantMessage || isCurrentParticipantMessage || isAdminMessage}`);
        
        return isAssistantMessage || isCurrentParticipantMessage || isAdminMessage;
      });
      
      debugLog('all', `Backup filtered ${filteredMessages.length} messages from ${processedMessages.length} total for participant view`);
      return filteredMessages;
    }

    // For admin mode, return all processed messages
    debugLog('all', `Returning all ${processedMessages.length} messages for admin view`);
    return processedMessages;
  }, [messages, viewMode, participants, participantNames, currentParticipant, processMessageAvatar, groupMessages]);
};
