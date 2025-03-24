
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
    
    debugLog('all', `Processing ${messages.length} messages in ${viewMode} mode`);
    
    // Map participants to their IDs for quicker lookup
    const participantMap = participants.reduce((map, p) => {
      map[p.id] = p;
      return map;
    }, {} as { [key: number]: ParticipantInfo });

    // Process each message to ensure correct avatar and participant info
    const processedMessages = messages.map(message => {
      const { processedAvatar, isAnonymous, displayName } = processMessageAvatar(
        message,
        message.participant ? participantMap[parseInt(message.participant.slice(1))] : null,
        currentParticipant
      );

      return {
        ...message,
        avatar: processedAvatar,
        isAnonymous,
        participant: displayName
      };
    });

    // For participant mode, filter messages
    if (viewMode === "participant") {
      const participantKey = `P${currentParticipant}`;
      return processedMessages.filter(message => 
        message.sender === "assistant" || 
        (message.sender === "user" && message.participant === participantKey)
      );
    }

    // For admin mode, group messages
    return groupMessages(processedMessages, "", true);
  }, [messages, viewMode, participants, participantNames, currentParticipant, processMessageAvatar, groupMessages]);
};
