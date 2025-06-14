
import { FACILITATION_STRATEGIES } from "./facilitation-strategies.ts";

/**
 * Generate a welcome message for the session
 */
export function generateWelcomeMessage(
  sessionType: string,
  sessionTitle: string,
  sessionObjective: string,
  sessionLanguage: string,
  participantCount: number,
  participantDescription: string
) {
  const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
  
  let welcomeMessage = `Welcome to "${sessionTitle}"!\n\n`;
  
  if (sessionObjective) {
    welcomeMessage += `Our objective today is: ${sessionObjective}\n\n`;
  }
  
  if (participantCount > 1) {
    welcomeMessage += `I see we have ${participantCount} ${participantDescription || "participants"} joining us today. `;
  } else {
    welcomeMessage += `Welcome! `;
  }
  
  welcomeMessage += `I'm here to facilitate our discussion and ensure everyone has the opportunity to contribute.\n\n`;
  
  // Add session-type specific opening
  switch (sessionType) {
    case "workshop":
      welcomeMessage += `Let's begin by sharing your initial thoughts or questions about our topic. What brings you here today, and what would you like to explore or achieve?`;
      break;
    case "training":
      welcomeMessage += `Before we dive into the content, I'd like to understand your current experience with this topic. What's your background, and what specific areas would you like to focus on?`;
      break;
    case "consultation":
      welcomeMessage += `Please share the specific challenges or questions you'd like to address today. The more context you can provide, the better I can tailor our discussion.`;
      break;
    case "coaching":
      welcomeMessage += `What specific goals or challenges would you like to work on today? What would make this session valuable for you?`;
      break;
    case "team_building":
      welcomeMessage += `Let's start by getting to know each other better. Share something about yourself and what you hope to gain from our time together.`;
      break;
    default:
      welcomeMessage += `Please share your thoughts, questions, or what you'd like to explore in our discussion today.`;
  }
  
  return welcomeMessage;
}

/**
 * Generate a facilitator response based on session context and participant input
 */
export function generateFacilitatorResponse(
  sessionProgress: string,
  participantStats: any,
  userTopics: string[],
  recentUserMessages: string[],
  groupSizeApproach: string,
  languageStyle: string,
  strategies: any
) {
  let response = "";
  
  // Handle wrap up mode specifically
  if (sessionProgress === "concluding") {
    response = generateWrapUpResponse(participantStats, userTopics, recentUserMessages, groupSizeApproach);
  } else {
    // Generate regular facilitator response
    response = generateRegularResponse(sessionProgress, participantStats, userTopics, recentUserMessages, groupSizeApproach, strategies);
  }
  
  return response;
}

function generateWrapUpResponse(
  participantStats: any,
  userTopics: string[],
  recentUserMessages: string[],
  groupSizeApproach: string
) {
  let response = "Thank you all for your valuable contributions to our discussion today. ";
  
  // Summarize key themes if we have them
  if (userTopics.length > 0) {
    response += `We've covered some important ground together, including ${userTopics.slice(0, 3).join(", ")}.`;
    if (userTopics.length > 3) {
      response += ` And several other valuable topics.`;
    }
    response += "\n\n";
  }
  
  // Acknowledge participation
  if (participantStats.activeParticipants > 1) {
    response += `I've appreciated hearing from ${participantStats.activeParticipants} participants, and the diverse perspectives you've shared have enriched our conversation.\n\n`;
  } else {
    response += `Thank you for your engaged participation and thoughtful contributions.\n\n`;
  }
  
  // Ask for final thoughts
  response += `As we wrap up, I'd like to invite any final thoughts, questions, or reflections you'd like to share. `;
  
  if (groupSizeApproach === "large group") {
    response += `Is there anything important we haven't covered, or any key insights you'd like to highlight?`;
  } else {
    response += `What's one key takeaway or next step you're taking away from our discussion?`;
  }
  
  response += `\n\nThank you for making this such a productive session!`;
  
  return response;
}

function generateRegularResponse(
  sessionProgress: string,
  participantStats: any,
  userTopics: string[],
  recentUserMessages: string[],
  groupSizeApproach: string,
  strategies: any
) {
  let response = "";
  
  // Analyze recent content for response direction
  const hasQuestions = recentUserMessages.some(msg => msg.includes('?'));
  const hasChallenges = recentUserMessages.some(msg => 
    msg.toLowerCase().includes('challenge') || 
    msg.toLowerCase().includes('difficult') ||
    msg.toLowerCase().includes('problem')
  );
  
  // Session progress based responses
  if (sessionProgress === "early") {
    response += "Great start to our discussion! ";
    if (participantStats.activeParticipants > 1) {
      response += "I'm hearing some interesting perspectives emerging. ";
    }
    
    if (hasQuestions) {
      response += "I notice some important questions being raised. ";
    }
    
    response += "Let's build on these ideas. ";
    
  } else if (sessionProgress === "middle") {
    response += "We're making good progress in our discussion. ";
    
    if (userTopics.length > 2) {
      response += `You've touched on several key areas: ${userTopics.slice(-2).join(" and ")}. `;
    }
    
    if (hasChallenges) {
      response += "I'm noting some challenges being highlighted - let's explore these further. ";
    }
  }
  
  // Add facilitating questions based on strategies
  if (strategies.techniques.includes("questioning")) {
    if (hasQuestions) {
      response += "What additional aspects of this should we consider? ";
    } else {
      response += "What questions does this raise for you? ";
    }
  } else if (strategies.techniques.includes("collaborative")) {
    response += "How do others see this? What's your experience been? ";
  } else if (strategies.techniques.includes("action-oriented")) {
    response += "What practical steps could address this? ";
  }
  
  return response;
}
