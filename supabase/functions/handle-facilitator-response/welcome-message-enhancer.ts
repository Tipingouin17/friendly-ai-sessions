
/**
 * Enhanced welcome message generation with comprehensive context passing
 */

import { 
  FacilitatorContext, 
  SessionContext 
} from "./enhanced-context-extractor.ts";

export interface EnhancedPromptConfig {
  facilitatorContext: FacilitatorContext;
  sessionContext: SessionContext;
  isSessionStart: boolean;
  participantCount: number;
}

/**
 * Create enhanced system prompt with complete facilitator and session context
 */
export function createEnhancedSystemPrompt(config: EnhancedPromptConfig): string {
  const { facilitatorContext, sessionContext, isSessionStart, participantCount } = config;
  
  const languageInstruction = sessionContext.language !== 'en' ? 
    `\n\nIMPORTANT: Please respond in ${getLanguageName(sessionContext.language)} language only.` : '';

  // Determine specialized terminology based on facilitator type
  const isSeriousGameMaster = facilitatorContext.name.toLowerCase().includes('game master') || 
                             facilitatorContext.specialties.some(s => s.toLowerCase().includes('game'));
  const isDigitalContext = sessionContext.participantDescription.toLowerCase().includes('digital') ||
                          sessionContext.objective.toLowerCase().includes('digital') ||
                          sessionContext.objective.toLowerCase().includes('tech');

  let basePrompt = `You are ${facilitatorContext.name}, a specialized facilitator with deep expertise in ${facilitatorContext.details}

CRITICAL FACILITATOR IDENTITY (you must embody this completely):
- Name: ${facilitatorContext.name}
- Background: ${facilitatorContext.details}
- Expertise Level: ${facilitatorContext.expertise}
- Specialties: ${facilitatorContext.specialties.join(', ')}
- Unique Value Proposition: ${facilitatorContext.details}

SESSION CONTEXT (reference these details throughout):
- Session Title: "${sessionContext.title}"
- Primary Objective: ${sessionContext.objective}
- Session Type: ${sessionContext.sessionType}
- Participant Count: ${participantCount}
- Participant Profile: ${sessionContext.participantDescription}
- Language: ${sessionContext.language}

PARTICIPANT-SPECIFIC APPROACH (critical for relevance):
- You are working specifically with ${sessionContext.participantDescription}
- Tailor all language, examples, and references to this audience
- Use terminology and concepts appropriate for ${sessionContext.participantDescription}
- Reference their likely background knowledge and interests
- Address their specific challenges and opportunities`;

  // Add specialized language for Serious Game Master
  if (isSeriousGameMaster) {
    basePrompt += `\n\nSPECIALIZED GAME MASTER APPROACH:
- Use gamification terminology naturally: "level up," "quest," "challenges," "achievements," "progression"
- Reference game mechanics: feedback loops, reward systems, progression systems, engagement drivers
- Frame problems as "design challenges" and solutions as "game mechanics"
- Use "player journey" instead of "user experience" when appropriate
- Refer to processes as "gameplay loops" or "systems"
- Encourage thinking about "engagement mechanics" and "motivation drivers"
- Reference concepts like "difficulty curves," "onboarding," "retention mechanics"`;
  }

  // Add digital-savvy language
  if (isDigitalContext) {
    basePrompt += `\n\nDIGITAL-SAVVY COMMUNICATION:
- Use tech-forward language: "platforms," "systems," "workflows," "digital transformation"
- Reference digital tools, automation, and technological solutions
- Discuss user experience (UX) principles and design thinking
- Mention data-driven approaches and analytics
- Reference digital trends and emerging technologies
- Use terminology around APIs, integrations, and digital ecosystems`;
  }

  basePrompt += `\n\nAUTHENTIC FACILITATION REQUIREMENTS:
- Always respond as ${facilitatorContext.name}, never as a generic AI
- Reference your specific expertise: ${facilitatorContext.details}
- Show genuine interest in ${sessionContext.participantDescription} perspectives
- Demonstrate how your background directly helps achieve: ${sessionContext.objective}
- Use your specialties (${facilitatorContext.specialties.join(', ')}) to add unique value
- Maintain your facilitator persona throughout all interactions${languageInstruction}`;

  if (isSessionStart) {
    basePrompt += `\n\nSESSION START REQUIREMENTS (generate compelling welcome):
1. Introduce yourself as ${facilitatorContext.name} with specific expertise in: ${facilitatorContext.details}
2. Acknowledge the ${participantCount} ${sessionContext.participantDescription} who have joined
3. Clearly state the session objective: "${sessionContext.objective}"
4. Reference your specialties: ${facilitatorContext.specialties.join(', ')} and how they support the goal
5. Use language/examples specifically appropriate for ${sessionContext.participantDescription}
6. Create an inclusive atmosphere matching the participant background and tech level
7. Set expectations for the ${sessionContext.sessionType} session format
8. Show enthusiasm for working with this specific group: ${sessionContext.participantDescription}
9. Explain how your unique background (${facilitatorContext.details}) will help achieve: ${sessionContext.objective}
10. Include an engaging opening activity or question that gets participants thinking about the topic`;

    if (isSeriousGameMaster) {
      basePrompt += `\n\nGAME MASTER WELCOME ENHANCEMENT:
- Frame the session as a "quest" or "challenge" to accomplish: ${sessionContext.objective}
- Use terms like "adventure," "journey," "level up," "achieve," "master"
- Refer to participants as "players" or "team members" naturally
- Introduce the concept of "leveling up" their skills in ${sessionContext.objective}
- Frame introductions as "character creation" or "player profiles"
- Reference the "end game" or final achievement they'll reach`;
    }
  }

  return basePrompt;
}

/**
 * Create enhanced prompt content with complete context awareness
 */
export function createEnhancedPromptContent(
  config: EnhancedPromptConfig,
  messages: any[] = []
): string {
  const { facilitatorContext, sessionContext, isSessionStart, participantCount } = config;
  
  let promptContent = `COMPLETE SESSION CONTEXT FOR ${facilitatorContext.name}:\n\n`;
  
  // Facilitator context
  promptContent += `YOUR FACILITATOR PROFILE:\n`;
  promptContent += `- You are: ${facilitatorContext.name}\n`;
  promptContent += `- Your expertise: ${facilitatorContext.details}\n`;
  promptContent += `- Your specialties: ${facilitatorContext.specialties.join(', ')}\n`;
  promptContent += `- Your expertise level: ${facilitatorContext.expertise}\n`;
  promptContent += `- Working with: ${sessionContext.participantDescription}\n\n`;
  
  // Session context
  promptContent += `SESSION DETAILS:\n`;
  promptContent += `- Title: "${sessionContext.title}"\n`;
  promptContent += `- Objective: ${sessionContext.objective}\n`;
  promptContent += `- Type: ${sessionContext.sessionType}\n`;
  promptContent += `- Participants: ${participantCount} ${sessionContext.participantDescription}\n`;
  promptContent += `- Language: ${sessionContext.language}\n\n`;
  
  // Context-specific instructions
  const isSeriousGameMaster = facilitatorContext.name.toLowerCase().includes('game master');
  const isDigitalSavvy = sessionContext.participantDescription.toLowerCase().includes('digital');
  
  if (isSeriousGameMaster) {
    promptContent += `GAME MASTER CONTEXT:\n`;
    promptContent += `- You specialize in gamification and engagement mechanics\n`;
    promptContent += `- Your goal is to transform "${sessionContext.objective}" into an engaging experience\n`;
    promptContent += `- Use game design principles and terminology naturally\n`;
    promptContent += `- Frame challenges as "quests" and solutions as "game mechanics"\n\n`;
  }
  
  if (isDigitalSavvy) {
    promptContent += `DIGITAL-SAVVY PARTICIPANTS:\n`;
    promptContent += `- Your audience consists of ${sessionContext.participantDescription}\n`;
    promptContent += `- Use tech-forward language and digital examples\n`;
    promptContent += `- Reference digital tools, platforms, and technological solutions\n`;
    promptContent += `- Discuss automation, workflows, and digital transformation concepts\n\n`;
  }
  
  if (isSessionStart) {
    promptContent += `SESSION START INSTRUCTIONS:\n`;
    promptContent += `Generate an engaging welcome message that:\n`;
    promptContent += `1. Introduces you as ${facilitatorContext.name} with your specific expertise\n`;
    promptContent += `2. Acknowledges the ${participantCount} ${sessionContext.participantDescription} participants\n`;
    promptContent += `3. Clearly explains the objective: "${sessionContext.objective}"\n`;
    promptContent += `4. References your specialties and how they help achieve the goal\n`;
    promptContent += `5. Uses language appropriate for ${sessionContext.participantDescription}\n`;
    promptContent += `6. Creates excitement about the ${sessionContext.sessionType} format\n`;
    promptContent += `7. Includes an engaging opening activity or question\n`;
    promptContent += `8. Shows your unique value in achieving: ${sessionContext.objective}\n\n`;
    
    if (isSeriousGameMaster) {
      promptContent += `GAME MASTER WELCOME ELEMENTS:\n`;
      promptContent += `- Frame as a "quest" to achieve: ${sessionContext.objective}\n`;
      promptContent += `- Use gamification terminology naturally\n`;
      promptContent += `- Refer to participant introductions as "character creation"\n`;
      promptContent += `- Mention "leveling up" skills and abilities\n`;
      promptContent += `- Reference the "end game" achievement\n\n`;
    }
  } else if (messages.length > 0) {
    promptContent += `CONVERSATION HISTORY:\n`;
    messages.slice(-5).forEach((msg, index) => {
      if (msg.sender === 'user') {
        promptContent += `Participant: ${msg.content}\n`;
      } else if (msg.sender === 'assistant') {
        promptContent += `${facilitatorContext.name}: ${msg.content}\n`;
      }
    });
    promptContent += '\n';
  }
  
  promptContent += `RESPONSE REQUIREMENTS:\n`;
  promptContent += `- Respond authentically as ${facilitatorContext.name}\n`;
  promptContent += `- Use your expertise (${facilitatorContext.details}) to add value\n`;
  promptContent += `- Tailor language for ${sessionContext.participantDescription}\n`;
  promptContent += `- Guide toward the objective: ${sessionContext.objective}\n`;
  promptContent += `- Demonstrate your specialties: ${facilitatorContext.specialties.join(', ')}\n`;
  promptContent += `- Maintain engagement appropriate for ${sessionContext.sessionType} format\n`;
  
  return promptContent;
}

/**
 * Validate generated welcome message quality
 */
export function validateWelcomeMessageQuality(
  content: string,
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext
): {
  isValid: boolean;
  score: number;
  feedback: string[];
  missingElements: string[];
} {
  const feedback: string[] = [];
  const missingElements: string[] = [];
  let score = 0;
  
  // Check for facilitator name
  if (content.includes(facilitatorContext.name)) {
    score += 20;
    feedback.push('✅ Facilitator name mentioned');
  } else {
    missingElements.push('Facilitator name');
  }
  
  // Check for facilitator expertise
  if (facilitatorContext.details && content.toLowerCase().includes(facilitatorContext.details.toLowerCase().split(' ')[0])) {
    score += 15;
    feedback.push('✅ Facilitator expertise referenced');
  } else {
    missingElements.push('Facilitator expertise');
  }
  
  // Check for session objective
  if (content.includes(sessionContext.objective) || content.toLowerCase().includes(sessionContext.objective.toLowerCase().split(' ')[0])) {
    score += 20;
    feedback.push('✅ Session objective mentioned');
  } else {
    missingElements.push('Session objective');
  }
  
  // Check for participant type
  if (content.includes(sessionContext.participantDescription)) {
    score += 15;
    feedback.push('✅ Participant type acknowledged');
  } else {
    missingElements.push('Participant type');
  }
  
  // Check for engagement elements
  if (content.includes('?') || content.includes('share') || content.includes('introduce')) {
    score += 10;
    feedback.push('✅ Engagement elements present');
  } else {
    missingElements.push('Engagement elements');
  }
  
  // Check for session title
  if (content.includes(sessionContext.title)) {
    score += 10;
    feedback.push('✅ Session title mentioned');
  } else {
    missingElements.push('Session title');
  }
  
  // Check for specialties
  if (facilitatorContext.specialties.some(specialty => content.toLowerCase().includes(specialty.toLowerCase()))) {
    score += 10;
    feedback.push('✅ Facilitator specialties referenced');
  } else {
    missingElements.push('Facilitator specialties');
  }
  
  const isValid = score >= 70; // Minimum 70% score required
  
  return {
    isValid,
    score,
    feedback,
    missingElements
  };
}

function getLanguageName(languageCode: string): string {
  const languageMap: { [key: string]: string } = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'zh': 'Chinese',
    'ar': 'Arabic'
  };
  return languageMap[languageCode] || languageCode;
}
