
/**
 * Enhanced context extraction utilities for facilitator responses
 */

export interface FacilitatorContext {
  name: string;
  details: string;
  expertise: string;
  specialties: string[];
  profilePicture: string | null;
}

export interface SessionContext {
  title: string;
  objective: string;
  sessionType: string;
  participantCount: number;
  participantDescription: string;
  language: string;
  welcomeMessage?: string;
}

/**
 * Extract facilitator context with proper fallbacks and error handling
 */
export function extractFacilitatorContext(conversation: any): FacilitatorContext {
  console.log('Extracting facilitator context from conversation:', {
    conversationId: conversation?.id,
    hasSession: !!conversation?.sessions,
    hasFacilitatorDetails: !!conversation?.sessions?.facilitator_details,
    hasDirectFacilitator: !!conversation?.facilitator
  });

  // Try multiple data paths for facilitator information
  const facilitatorFromSession = conversation?.sessions?.facilitator_details;
  const facilitatorDirect = conversation?.facilitator;
  const facilitatorFromSessionsTable = conversation?.sessions?.facilitator;

  const facilitator = facilitatorFromSession || facilitatorDirect || facilitatorFromSessionsTable;

  if (!facilitator) {
    console.warn('No facilitator data found in conversation, using fallback');
    return {
      name: 'Facilitator',
      details: 'Professional session facilitator with expertise in group dynamics and engagement.',
      expertise: 'Professional',
      specialties: ['facilitation', 'group dynamics'],
      profilePicture: null
    };
  }

  const context: FacilitatorContext = {
    name: facilitator.title || 'Facilitator',
    details: facilitator.details || facilitator.description || 'Professional session facilitator',
    expertise: facilitator.expertise_level || 'Professional',
    specialties: Array.isArray(facilitator.specialties) ? facilitator.specialties : ['facilitation'],
    profilePicture: facilitator.profile_picture || null
  };

  console.log('Extracted facilitator context:', context);
  return context;
}

/**
 * Extract session context with comprehensive data
 */
export function extractSessionContext(conversation: any, participants?: any[]): SessionContext {
  console.log('Extracting session context from conversation:', {
    conversationId: conversation?.id,
    hasSession: !!conversation?.sessions,
    participantCount: conversation?.participants || participants?.length || 0
  });

  const session = conversation?.sessions;
  const participantCount = conversation?.participants || participants?.length || 1;
  const participantDescription = conversation?.participant_description || 'participants';

  const context: SessionContext = {
    title: session?.title || 'Discussion Session',
    objective: session?.objective || 'facilitate meaningful discussion and engagement',
    sessionType: session?.session_type || 'workshop',
    participantCount,
    participantDescription,
    language: conversation?.language || 'en',
    welcomeMessage: session?.welcome_message
  };

  console.log('Extracted session context:', context);
  return context;
}

/**
 * Create contextual system prompt with complete facilitator and session information
 */
export function createContextualSystemPrompt(
  facilitatorContext: FacilitatorContext,
  sessionContext: SessionContext,
  sessionProgress: string = 'early',
  isSessionStart: boolean = false
): string {
  const languageInstruction = sessionContext.language !== 'en' ? 
    `\n\nIMPORTANT: Please respond in ${getLanguageName(sessionContext.language)} language only.` : '';

  let basePrompt = `You are ${facilitatorContext.name}, an expert facilitator leading a ${sessionContext.sessionType} session titled "${sessionContext.title}".

FACILITATOR PROFILE (CRITICAL - USE THIS CONTEXT):
- Name: ${facilitatorContext.name}
- Background & Expertise: ${facilitatorContext.details}
- Expertise Level: ${facilitatorContext.expertise}
- Specialties: ${facilitatorContext.specialties.join(', ')}
- Your unique value: ${facilitatorContext.details}

SESSION CONTEXT (CRITICAL - REFERENCE THESE DETAILS):
- Objective: ${sessionContext.objective}
- Current progress: ${sessionProgress} stage
- Session type: ${sessionContext.sessionType}
- Title: ${sessionContext.title}

PARTICIPANT INFORMATION (CRITICAL - TAILOR TO THIS GROUP):
- Number of participants: ${sessionContext.participantCount}
- Participant type: ${sessionContext.participantDescription}
- Your approach: Adapt your facilitation style specifically for ${sessionContext.participantDescription}
- Use language, examples, and references appropriate for ${sessionContext.participantDescription}

AUTHENTIC FACILITATION AS ${facilitatorContext.name}:
- Respond authentically as ${facilitatorContext.name}, not as a generic AI
- Reference your specific background: ${facilitatorContext.details}
- Show genuine interest in ${sessionContext.participantDescription} contributions
- Guide toward the objective: ${sessionContext.objective} using your expertise
- Demonstrate how your background helps achieve: ${sessionContext.objective}${languageInstruction}`;

  if (isSessionStart) {
    basePrompt += `\n\nCRITICAL SESSION START CONTEXT: Generate an engaging welcome message that:
1. Introduces yourself as ${facilitatorContext.name} with your specific expertise: ${facilitatorContext.details}
2. Acknowledges the ${sessionContext.participantCount} ${sessionContext.participantDescription} who have joined this session
3. Clearly explains the session objective: "${sessionContext.objective}"
4. References your specialties: ${facilitatorContext.specialties.join(', ')}
5. Uses language and examples specifically appropriate for ${sessionContext.participantDescription}
6. Creates an inclusive atmosphere that matches the participant background and expertise level
7. Sets clear expectations for participation based on the session type: ${sessionContext.sessionType}
8. Shows enthusiasm for working with this specific group: ${sessionContext.participantDescription}
9. Mentions how your background (${facilitatorContext.details}) will help achieve: ${sessionContext.objective}`;
  }

  return basePrompt;
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
