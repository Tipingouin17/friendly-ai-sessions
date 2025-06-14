
import { useCallback } from 'react';
import { Message } from '@/types/chat';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { debugLog } from '@/utils/debugLogger';
import { processFacilitatorAvatar } from './utils/avatarProcessing';
import { resolveFacilitatorAvatar } from '@/utils/avatarUtils';

interface UseMessageFormattingProps {
  conversation?: any;
}

export const useMessageFormatting = ({ conversation }: UseMessageFormattingProps) => {
  // Format database messages into app format
  const formatDatabaseMessages = useCallback(async (dbMessages: any[]): Promise<Message[]> => {
    // Process messages with async processing
    const formattedMessagesPromises = dbMessages.map(async msg => {
      let messageContent = '';
      let participantId: string | undefined = undefined;
      let likesArray: string[] = [];
      let isReport = false;
      let isAnonymous = false;
      let avatarUrl = undefined;
      
      if (typeof msg.content === 'string') {
        messageContent = msg.content;
      } else if (msg.content && typeof msg.content === 'object') {
        const contentObj = msg.content as Record<string, any>;
        
        if ('text' in contentObj) {
          messageContent = contentObj.text as string;
        } else {
          messageContent = JSON.stringify(contentObj);
        }
        
        if ('participant_id' in contentObj) {
          participantId = `P${contentObj.participant_id}`;
        }
        
        if ('likes' in contentObj && Array.isArray(contentObj.likes)) {
          likesArray = contentObj.likes as string[];
        }
        
        if ('avatar' in contentObj && contentObj.avatar) {
          avatarUrl = contentObj.avatar as string;
          debugLog('all', `Found avatar in message content: ${avatarUrl}`);
        }
        
        isReport = 'is_report' in contentObj ? Boolean(contentObj.is_report) : false;
        isAnonymous = 'is_anonymous' in contentObj ? Boolean(contentObj.is_anonymous) : false;
      }
      
      const color = participantId ? getParticipantColor(participantId) : undefined;
      
      // Determine sender type based on role
      let sender: "user" | "assistant" | "admin";
      if (msg.role === 'admin') {
        sender = 'admin';
      } else if (msg.role === 'assistant') {
        sender = 'assistant';
      } else {
        sender = 'user';
      }
      
      // Handle facilitator avatar for assistant messages using conversation data
      if (sender === 'assistant') {
        if (!avatarUrl && conversation) {
          // Use the proper avatar resolution function with conversation data
          avatarUrl = await resolveFacilitatorAvatar(msg, conversation);
          debugLog('all', `Resolved facilitator avatar URL: ${avatarUrl}`);
        }
        
        // Ensure avatar URL is properly formatted
        if (avatarUrl) {
          avatarUrl = processFacilitatorAvatar(avatarUrl);
        }
      }
      
      return {
        id: String(msg.id),
        content: messageContent,
        sender,
        participant: participantId,
        color,
        timestamp: new Date(msg.created_at),
        created_at: msg.created_at,
        likes: likesArray,
        isReport,
        isAnonymous,
        avatar: avatarUrl
      } as Message;
    });
    
    // Wait for all message processing to complete
    return await Promise.all(formattedMessagesPromises);
  }, [conversation]);

  return { formatDatabaseMessages };
};
