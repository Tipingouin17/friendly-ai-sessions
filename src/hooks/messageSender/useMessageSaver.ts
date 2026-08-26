/**
 * use Message Saver
 *
 * Message sender hook for the AIfacilitator application.
 */

import api from "@/lib/api";
import { Message } from "@/types/chat";
import { nanoid } from "nanoid";

type SaveMessageProps = {
  message: string;
  currentConversationId: number | null;
  currentParticipant: number;
  participantInfo: any;
  isAnonymous: boolean;
  color: string;
};

export const useMessageSaver = () => {
  // Save a message to the UI and database
  const saveUserMessage = async ({
    message,
    currentConversationId,
    currentParticipant,
    participantInfo,
    isAnonymous,
    color
  }: SaveMessageProps): Promise<Message> => {
    if (!currentConversationId) {
      throw new Error("No conversation ID provided");
    }

    // If currentParticipant is 0 (not yet resolved from async state), fall back to URL params
    const urlParams = new URLSearchParams(window.location.search);
    const urlParticipantId = urlParams.get('participantId');
    const effectiveParticipantId = currentParticipant || (urlParticipantId ? parseInt(urlParticipantId, 10) : 0);

    const currentParticipantKey = String(effectiveParticipantId);

    // Resolve participant name: use participantInfo, then URL name param, then fallback
    const urlName = urlParams.get('name') || undefined;
    const resolvedName = participantInfo?.name || urlName || `Participant ${effectiveParticipantId}`;

    // Create message for UI
    const messageId = nanoid();
    const newMessage: Message = {
      id: messageId,
      content: message,
      sender: "user",
      participant: currentParticipantKey,
      timestamp: new Date(),
      color: color,
      avatar: participantInfo?.avatar,
      name: resolvedName,
      isAnonymous: isAnonymous
    };

    // Save to database with participant_id column for privacy
    const { data, error } = await api.from('messages').insert({
      conversation_id: currentConversationId,
      participant_id: effectiveParticipantId,
      content: {
        text: message,
        participant_id: effectiveParticipantId,
        name: resolvedName,
        is_anonymous: isAnonymous
      },
      role: 'user',
      name: resolvedName
    }).select();

    if (error) {
      console.error("Error saving message to database:", error);
      const saveError = new Error(error.message) as Error & { code?: string; status?: number };
      saveError.code = error.code;
      saveError.status = error.status;
      throw saveError;
    }

    // Reuse the persisted identity so the optimistic message and the later
    // realtime INSERT reconcile to one transcript item instead of appearing as
    // two copies of the participant's answer.
    const persistedMessage = Array.isArray(data) ? data[0] : data;
    if (persistedMessage && typeof persistedMessage === 'object') {
      const persisted = persistedMessage as { id?: string | number; created_at?: string | null };
      if (persisted.id != null) newMessage.id = String(persisted.id);
      if (persisted.created_at) {
        const createdAt = new Date(persisted.created_at);
        if (!Number.isNaN(createdAt.getTime())) newMessage.timestamp = createdAt;
      }
    }

    return newMessage;
  };

  return { saveUserMessage };
};
