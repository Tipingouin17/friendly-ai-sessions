
import { supabase } from "@/integrations/supabase/client";
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

    const currentParticipantKey = `P${currentParticipant}`;

    // Resolve participant name: use participantInfo, then URL name param, then fallback
    const urlName = new URLSearchParams(window.location.search).get('name') || undefined;
    const resolvedName = participantInfo?.name || urlName || `Participant ${currentParticipant}`;

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
      isAnonymous: isAnonymous
    };

    // Save to database with participant_id column for privacy
    const { data, error } = await supabase.from('messages').insert({
      conversation_id: currentConversationId,
      participant_id: currentParticipant,
      content: {
        text: message,
        participant_id: currentParticipant,
        name: resolvedName,
        is_anonymous: isAnonymous
      },
      role: 'user',
      name: resolvedName
    }).select();

    if (error) {
      console.error("Error saving message to database:", error);
      throw new Error(error.message);
    }

    return newMessage;
  };

  return { saveUserMessage };
};
