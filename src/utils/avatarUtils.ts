/**
 * avatar Utils
 *
 * Utility for the AIfacilitator application.
 */

import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

/**
 * Resolves facilitator avatar URL by checking multiple sources in order of priority
 */
export const resolveFacilitatorAvatar = async (
  response: any, 
  conversation: any
): Promise<string | null> => {
  // Start with the facilitator's profile picture from conversation data
  let avatarUrl = conversation?.sessions?.facilitator_details?.profile_picture;
  
  // If no avatar from conversation, try the avatar from AI response
  if (!avatarUrl && response?.avatar) {
    avatarUrl = response.avatar;
  }
  
  // If still no avatar but we have facilitator details, try to get the avatar URL
  if (!avatarUrl && conversation?.sessions?.facilitator_details) {
    if (conversation.sessions.facilitator_details.id) {
      avatarUrl = await getFacilitatorAvatarUrl(conversation.sessions.facilitator_details);
    } else {
      let picUrl = conversation.sessions.facilitator_details.profile_picture;
      if (picUrl && typeof picUrl === 'string') {
        picUrl = picUrl.replace(/([^:])\/\//g, '$1/');
      }
      avatarUrl = await getFacilitatorAvatarUrl({
        profile_picture: picUrl,
        title: conversation.sessions.facilitator_details.title
      });
    }
  }

  // Normalize the avatar URL to avoid double slashes
  if (avatarUrl && typeof avatarUrl === 'string') {
    avatarUrl = avatarUrl.replace(/([^:])\/\//g, '$1/');
  }

  return avatarUrl;
};
