
/**
 * Analyze session context and determine appropriate facilitation approach
 */
export function analyzeSessionContext(
  participantCount: number, 
  participantDescription: string
) {
  // Determine appropriate facilitation approach based on participant count
  let groupSizeApproach = "";
  if (participantCount <= 3) {
    groupSizeApproach = "small group";
  } else if (participantCount <= 8) {
    groupSizeApproach = "medium group"; 
  } else {
    groupSizeApproach = "large group";
  }
  
  // Determine language style based on participant description
  let languageStyle = "professional";
  if (participantDescription) {
    const descLower = participantDescription.toLowerCase();
    if (descLower.includes("student") || descLower.includes("young") || descLower.includes("beginner")) {
      languageStyle = "accessible";
    } else if (descLower.includes("expert") || descLower.includes("technical") || descLower.includes("professional")) {
      languageStyle = "technical";
    } else if (descLower.includes("executive") || descLower.includes("leader") || descLower.includes("senior")) {
      languageStyle = "executive";
    }
  }
  
  return {
    groupSizeApproach,
    languageStyle
  };
}

/**
 * Determine session progress stage based on timing information
 */
export function determineSessionProgress(
  messages: any[],
  sessionDurationMinutes?: number
) {
  let sessionProgress = "early";
  
  if (sessionDurationMinutes) {
    const firstMessageTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date();
    const elapsed = (new Date().getTime() - firstMessageTime.getTime()) / (1000 * 60);
    const progressPercent = Math.min(100, Math.round((elapsed / sessionDurationMinutes) * 100));
    
    if (progressPercent > 80) sessionProgress = "concluding";
    else if (progressPercent > 40) sessionProgress = "middle";
  }
  
  return sessionProgress;
}

/**
 * Get the appropriate facilitator avatar URL based on conversation data
 */
export function getFacilitatorAvatar(conversation: any) {
  if (!conversation) return null;
  
  // Check if there's a profile picture in the facilitator details
  if (conversation.sessions?.facilitator_details?.profile_picture) {
    return conversation.sessions.facilitator_details.profile_picture;
  }
  
  // Fall back to a consistent avatar pattern
  const facilitatorTitle = conversation.sessions?.facilitator_details?.title || 'Facilitator';
  return `/api/avatar?name=${encodeURIComponent(facilitatorTitle)}&variant=beam&palette=2`;
}
