
import { Message } from "@/types/chat";

interface MessageGroup {
  question: Message;
  responses: Message[];
}

export const useMessageGrouping = () => {
  const groupMessages = (
    messages: Message[],
    searchTerm: string,
    showAnonymous: boolean
  ): MessageGroup[] => {
    if (messages.length === 0) {
      return [];
    }

    // Handle case where there's no facilitator message
    if (!messages.some(m => m.sender === "assistant")) {
      const userMessages = messages.filter(m => 
        m.sender === "user" && 
        (showAnonymous || !m.isAnonymous) &&
        (!searchTerm || m.content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      if (userMessages.length > 0) {
        return [{
          question: {
            id: "default-question",
            content: "Participant messages",
            sender: "assistant",
            timestamp: new Date()
          },
          responses: userMessages
        }];
      }
      return [];
    }

    const groups: MessageGroup[] = [];
    let currentGroup = { question: null, responses: [] } as any;

    for (const message of messages) {
      if (message.sender === "assistant" && !message.isReport) {
        if (currentGroup.question && currentGroup.responses.length > 0) {
          groups.push({ ...currentGroup });
        }
        currentGroup = { question: message, responses: [] };
      } else if (message.sender === "user") {
        if (showAnonymous || !message.isAnonymous) {
          if (!searchTerm || message.content.toLowerCase().includes(searchTerm.toLowerCase())) {
            if (currentGroup.question) {
              currentGroup.responses.push(message);
            } else if (groups.length === 0) {
              currentGroup = {
                question: {
                  id: "default-question",
                  content: "Participant messages",
                  sender: "assistant",
                  timestamp: new Date()
                },
                responses: [message]
              };
            }
          }
        }
      }
    }

    if (currentGroup.question && currentGroup.responses.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  };

  return { groupMessages };
};
