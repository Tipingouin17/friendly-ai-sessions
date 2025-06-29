
/**
 * Enhanced fallback system with context-aware templates
 */

import { 
  FacilitatorContext, 
  SessionContext 
} from "./enhanced-context-extractor.ts";

export interface FallbackGenerationResult {
  content: string;
  fallbackType: string;
  contextUsed: {
    facilitatorName: boolean;
    facilitatorExpertise: boolean;
    participantType: boolean;
    sessionObjective: boolean;
    facilitatorSpecialties: boolean;
  };
}

/**
 * Generate context-aware fallback messages based on facilitator and session context
 */
export function generateContextAwareFallback(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext,
  sessionProgress: string = 'early',
  isSessionStart: boolean = false
): FallbackGenerationResult {
  
  console.log('🎯 Generating context-aware fallback:', {
    facilitatorName: facilitatorContext.name,
    participantType: sessionContext.participantDescription,
    sessionObjective: sessionContext.objective.substring(0, 50) + '...',
    sessionProgress,
    isSessionStart
  });
  
  const contextUsed = {
    facilitatorName: !!facilitatorContext.name,
    facilitatorExpertise: !!facilitatorContext.details,
    participantType: !!sessionContext.participantDescription,
    sessionObjective: !!sessionContext.objective,
    facilitatorSpecialties: facilitatorContext.specialties.length > 0
  };
  
  let content = '';
  let fallbackType = 'generic';
  
  // Generate facilitator-specific welcome message
  if (isSessionStart) {
    content = generateFacilitatorSpecificWelcome(facilitatorContext, sessionContext);
    fallbackType = 'facilitator_specific_welcome';
  } else {
    content = generateFacilitatorSpecificResponse(facilitatorContext, sessionContext, sessionProgress);
    fallbackType = 'facilitator_specific_response';
  }
  
  console.log('✅ Context-aware fallback generated:', {
    contentLength: content.length,
    fallbackType,
    contextUsed
  });
  
  return {
    content,
    fallbackType,
    contextUsed
  };
}

/**
 * Generate facilitator-specific welcome message
 */
function generateFacilitatorSpecificWelcome(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext
): string {
  const { name, details, expertise, specialties } = facilitatorContext;
  const { title, objective, participantDescription, participantCount } = sessionContext;
  
  // Determine facilitator type for specialized language
  const isSeriousGameMaster = name.toLowerCase().includes('game master') || 
                             specialties.some(s => s.toLowerCase().includes('game'));
  const isDigitalSavvy = participantDescription.toLowerCase().includes('digital') ||
                        participantDescription.toLowerCase().includes('tech');
  
  let welcomeMessage = `Welcome to "${title}"! I'm ${name}, and I'm thrilled to have you join us today.\n\n`;
  
  // Add facilitator expertise with specialized language
  if (isSeriousGameMaster) {
    welcomeMessage += `As your ${name}, I bring expertise in transforming everyday processes into engaging experiences through game mechanics and design principles. `;
    welcomeMessage += `With my background in ${details.includes('gamification') ? 'gamification strategies' : 'interactive learning design'}, `;
    welcomeMessage += `I'm here to help you level up your approach to ${objective}.\n\n`;
  } else if (details) {
    welcomeMessage += `With my background in ${details}, I'm here to guide our exploration of ${objective}.\n\n`;
  }
  
  // Add session objective with context
  if (objective.toLowerCase().includes('game') || objective.toLowerCase().includes('engaging')) {
    welcomeMessage += `Our quest today is to: ${objective}\n\n`;
  } else {
    welcomeMessage += `Our objective for this session is: ${objective}\n\n`;
  }
  
  // Participant-specific language
  if (isDigitalSavvy) {
    welcomeMessage += `I see we have ${participantCount} ${participantDescription} participants here today - perfect! `;
    welcomeMessage += `Your tech-forward mindset will be invaluable as we explore innovative approaches to this challenge.\n\n`;
    
    if (isSeriousGameMaster) {
      welcomeMessage += `To kick off our session, I'd love to hear from each of you:\n\n`;
      welcomeMessage += `• Your name and current role in the digital space\n`;
      welcomeMessage += `• What existing processes or workflows you'd like to "gamify" or make more engaging\n`;
      welcomeMessage += `• Your experience with game mechanics, user engagement, or behavioral design\n`;
      welcomeMessage += `• One specific outcome you'd like to achieve by the end of our session\n\n`;
      welcomeMessage += `Think of this as your character creation phase - help me understand your unique skills and what drives you! `;
      welcomeMessage += `Who's ready to start this adventure in ${objective.toLowerCase()}?`;
    } else {
      welcomeMessage += `Let's dive in! Please share:\n\n`;
      welcomeMessage += `• Your name and role\n`;
      welcomeMessage += `• Your experience with today's topic\n`;
      welcomeMessage += `• What specific challenges or opportunities you're facing\n`;
      welcomeMessage += `• What success would look like for you today\n\n`;
      welcomeMessage += `Your tech expertise will help us approach this from innovative angles!`;
    }
  } else {
    welcomeMessage += `I'm excited to work with our ${participantCount} ${participantDescription} today. `;
    
    if (isSeriousGameMaster) {
      welcomeMessage += `Let's start by getting to know each other:\n\n`;
      welcomeMessage += `• Your name and background\n`;
      welcomeMessage += `• What processes or experiences you'd like to make more engaging\n`;
      welcomeMessage += `• Your familiarity with game elements or interactive design\n`;
      welcomeMessage += `• What you hope to accomplish in our time together\n\n`;
      welcomeMessage += `Consider this your opportunity to introduce your "player character" - what unique perspective and goals are you bringing to this challenge?`;
    } else {
      welcomeMessage += `To get started, please share:\n\n`;
      welcomeMessage += `• Your name and background\n`;
      welcomeMessage += `• How this session relates to your work or interests\n`;
      welcomeMessage += `• What questions or challenges you're bringing\n`;
      welcomeMessage += `• What you hope to take away from our discussion\n\n`;
      welcomeMessage += `I'm looking forward to learning from your diverse perspectives!`;
    }
  }
  
  return welcomeMessage;
}

/**
 * Generate facilitator-specific response for ongoing sessions
 */
function generateFacilitatorSpecificResponse(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext,
  sessionProgress: string
): string {
  const { name, details, specialties } = facilitatorContext;
  const { objective, participantDescription } = sessionContext;
  
  const isSeriousGameMaster = name.toLowerCase().includes('game master') || 
                             specialties.some(s => s.toLowerCase().includes('game'));
  const isDigitalSavvy = participantDescription.toLowerCase().includes('digital');
  
  let response = '';
  
  if (sessionProgress === 'concluding') {
    response = generateContextualWrapUp(facilitatorContext, sessionContext, isSeriousGameMaster, isDigitalSavvy);
  } else {
    response = generateContextualContinuation(facilitatorContext, sessionContext, sessionProgress, isSeriousGameMaster, isDigitalSavvy);
  }
  
  return response;
}

function generateContextualWrapUp(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext,
  isSeriousGameMaster: boolean,
  isDigitalSavvy: boolean
): string {
  const { name } = facilitatorContext;
  const { objective, participantDescription } = sessionContext;
  
  let response = '';
  
  if (isSeriousGameMaster) {
    response = `Excellent work, team! As we reach the final level of our ${objective.toLowerCase()} journey, `;
    response += `I want to acknowledge the creative strategies and innovative thinking you've all brought to this challenge.\n\n`;
    
    if (isDigitalSavvy) {
      response += `Your tech-forward approaches to gamification have been impressive. `;
      response += `You've shown how digital tools and game mechanics can transform traditional processes into engaging experiences.\n\n`;
    }
    
    response += `Before we conclude this session, I'd like to hear your final thoughts:\n\n`;
    response += `• What's one game mechanic or engagement strategy you're excited to implement?\n`;
    response += `• How will you measure the "engagement score" of your improvements?\n`;
    response += `• What's your next "quest" in applying these concepts?\n\n`;
    response += `Remember, the best games are those that keep players coming back for more. `;
    response += `How will you ensure your solutions create that same level of sustained engagement?`;
  } else {
    response = `Thank you all for your valuable contributions to our discussion on ${objective}. `;
    response += `As we wrap up, I'd like to capture some key takeaways and next steps.\n\n`;
    
    if (isDigitalSavvy) {
      response += `Your technical insights have really enriched our conversation. `;
    }
    
    response += `For our final reflection:\n\n`;
    response += `• What's one key insight you're taking away from today?\n`;
    response += `• How will you apply what we've discussed to your current challenges?\n`;
    response += `• What questions do you still have that we should explore?\n\n`;
    response += `Thank you for making this such a productive session!`;
  }
  
  return response;
}

function generateContextualContinuation(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext,
  sessionProgress: string,
  isSeriousGameMaster: boolean,
  isDigitalSavvy: boolean
): string {
  const { objective, participantDescription } = sessionContext;
  
  let response = '';
  
  if (isSeriousGameMaster) {
    if (sessionProgress === 'early') {
      response = `Great start, everyone! I'm seeing some interesting ideas emerge around ${objective}. `;
      
      if (isDigitalSavvy) {
        response += `Your digital expertise is already showing in how you're thinking about user engagement and experience design.\n\n`;
      }
      
      response += `Let's level up our discussion. Think about this challenge like designing a game:\n\n`;
      response += `• What's the "core gameplay loop" of your current process?\n`;
      response += `• Where are the friction points that make users want to "quit the game"?\n`;
      response += `• What rewards or achievements could motivate continued engagement?\n\n`;
      response += `Who wants to share their "player journey" analysis?`;
    } else {
      response = `Excellent progress! You're really mastering the art of ${objective}. `;
      response += `I'm impressed by how you're applying game design thinking to real-world challenges.\n\n`;
      
      if (isDigitalSavvy) {
        response += `Your technical background is really shining through in these solutions. `;
      }
      
      response += `Let's dive deeper into the mechanics:\n\n`;
      response += `• How would you create a "progression system" for your users?\n`;
      response += `• What "feedback loops" would keep them engaged?\n`;
      response += `• How might you introduce "social elements" or collaboration?\n\n`;
      response += `What's your next move in this game design challenge?`;
    }
  } else {
    if (sessionProgress === 'early') {
      response = `Thank you for those insights! I'm hearing some compelling perspectives on ${objective}. `;
      
      if (isDigitalSavvy) {
        response += `Your technical expertise is adding valuable depth to our discussion.\n\n`;
      }
      
      response += `Let's build on these ideas. I'm curious to explore:\n\n`;
      response += `• What patterns are you seeing in the challenges we've identified?\n`;
      response += `• How might we approach these issues differently?\n`;
      response += `• What resources or tools could support your goals?\n\n`;
      response += `Who would like to share their thoughts on these questions?`;
    } else {
      response = `We're making great progress in our exploration of ${objective}. `;
      response += `The connections you're making between concepts are really valuable.\n\n`;
      
      if (isDigitalSavvy) {
        response += `I particularly appreciate how you're thinking about the technical implementation aspects. `;
      }
      
      response += `As we continue, let's consider:\n\n`;
      response += `• What practical steps could you take to implement these ideas?\n`;
      response += `• What obstacles might you encounter, and how would you address them?\n`;
      response += `• How would you measure success?\n\n`;
      response += `What questions or concerns do you have as we move forward?`;
    }
  }
  
  return response;
}
