
import { FACILITATION_STRATEGIES } from "./facilitation-strategies.ts";

/**
 * Generate an engaging welcome message that prompts participants to describe themselves
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
  
  // Start with a warm, engaging greeting
  let welcomeMessage = `Welcome to "${sessionTitle}"! I'm excited to have you join us today.\n\n`;
  
  // Add session objective if provided
  if (sessionObjective) {
    welcomeMessage += `Our objective is: ${sessionObjective}\n\n`;
  }
  
  // Acknowledge participant count with enthusiasm
  if (participantCount > 1) {
    welcomeMessage += `I see we have ${participantCount} ${participantDescription || "participants"} here today - wonderful! `;
  } else {
    welcomeMessage += `Great to have you here! `;
  }
  
  welcomeMessage += `I'm here to facilitate our discussion and ensure everyone gets the chance to contribute meaningfully.\n\n`;
  
  // Add session-type specific engagement prompts that ask for self-description
  switch (sessionType) {
    case "workshop":
      welcomeMessage += `To get us started, I'd love to learn about each of you! Please share:\n\n`;
      welcomeMessage += `• Your name (or how you'd like to be addressed)\n`;
      welcomeMessage += `• Your background or connection to today's topic\n`;
      welcomeMessage += `• What specific aspect of this workshop interests you most\n`;
      welcomeMessage += `• One thing you hope to take away from our time together\n\n`;
      welcomeMessage += `Feel free to jump in and introduce yourself!`;
      break;
      
    case "training":
      welcomeMessage += `Before we dive into the training content, let's get to know each other! Please tell us:\n\n`;
      welcomeMessage += `• Your name and current role\n`;
      welcomeMessage += `• Your experience level with today's topic\n`;
      welcomeMessage += `• What challenges you're hoping this training will help you solve\n`;
      welcomeMessage += `• Any specific skills you want to develop\n\n`;
      welcomeMessage += `Who would like to start us off?`;
      break;
      
    case "consultation":
      welcomeMessage += `I'm here to help address your specific needs today. To provide the best guidance, please share:\n\n`;
      welcomeMessage += `• Your name and background relevant to today's discussion\n`;
      welcomeMessage += `• The specific challenges or questions you're facing\n`;
      welcomeMessage += `• What context or situation led you here\n`;
      welcomeMessage += `• What kind of outcome would make this session valuable for you\n\n`;
      welcomeMessage += `The more context you can provide, the better I can tailor our discussion to help you!`;
      break;
      
    case "coaching":
      welcomeMessage += `This is your space to explore and grow. To make our session most effective, please share:\n\n`;
      welcomeMessage += `• Your name and a bit about yourself\n`;
      welcomeMessage += `• What area of your life or work you'd like to focus on\n`;
      welcomeMessage += `• Any specific goals or challenges you're working through\n`;
      welcomeMessage += `• What success would look like for you today\n\n`;
      welcomeMessage += `Remember, this is a safe space for exploration and growth. Who's ready to dive in?`;
      break;
      
    case "team_building":
      welcomeMessage += `Let's start building connections! I'd love for everyone to introduce themselves by sharing:\n\n`;
      welcomeMessage += `• Your name and role in the team\n`;
      welcomeMessage += `• One interesting thing about yourself (work or personal)\n`;
      welcomeMessage += `• What you enjoy most about working with this team\n`;
      welcomeMessage += `• One thing you hope we'll accomplish together today\n\n`;
      welcomeMessage += `Let's go around and get to know each other better!`;
      break;
      
    default:
      welcomeMessage += `To create the best experience for everyone, please take a moment to introduce yourself:\n\n`;
      welcomeMessage += `• Your name and background\n`;
      welcomeMessage += `• How this topic relates to your interests or work\n`;
      welcomeMessage += `• What questions or ideas you're bringing to our discussion\n`;
      welcomeMessage += `• What you're hoping to gain from our time together\n\n`;
      welcomeMessage += `I'm looking forward to hearing from each of you and learning about your perspectives!`;
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
