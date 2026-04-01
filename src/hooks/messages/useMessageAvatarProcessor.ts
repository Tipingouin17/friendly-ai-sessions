
import { Message, ParticipantInfo } from "@/types/chat";
import { isImageUrl } from "@/utils/facilitatorUtils";
import { isInCrossOriginContext } from "@/utils/crossOriginUtils";
import { debugLog } from "@/utils/debugLogger";

interface MessageAvatarResult {
  processedAvatar: string | undefined;
  isAnonymous: boolean;
  displayName: string;
}

export const useMessageAvatarProcessor = () => {
  const processMessageAvatar = (
    message: Message,
    participantInfo?: ParticipantInfo | null,
    currentUserParticipantId?: number
  ): MessageAvatarResult => {
    const isAnonymous = message.isAnonymous && message.sender === "user";
    
    // Handle participant name display
    let displayName = isAnonymous ? "Anonymous participant" : 
                     participantInfo?.name || 
                     (typeof message.participant === 'string' ? message.participant : "Participant");
    
    // Don't show "Participant X" if we have a real name
    if (displayName.startsWith("Participant") && participantInfo?.name) {
      displayName = participantInfo.name;
    }
    
    // Show "You" for current user
    if (currentUserParticipantId && 
        message.participant === String(currentUserParticipantId) && 
        !isAnonymous) {
      displayName = "You";
    }

    // Process avatar URL
    let processedAvatar = message.avatar;
    if (message.sender === "assistant" && processedAvatar) {
      debugLog('all', `Processing facilitator avatar: ${processedAvatar}`);
      
      // Normalize URLs with double slashes
      processedAvatar = processedAvatar.replace(/([^:])\/\//g, '$1/');
      
      // Add crossorigin parameter if needed
      if (isInCrossOriginContext() && isImageUrl(processedAvatar)) {
        processedAvatar += (processedAvatar.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
      }
    }

    return {
      processedAvatar,
      isAnonymous,
      displayName
    };
  };

  return { processMessageAvatar };
};
