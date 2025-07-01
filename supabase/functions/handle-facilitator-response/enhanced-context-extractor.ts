
/**
 * Enhanced context extraction utilities for AI generation
 */

export function extractFacilitatorContext(conversation: any) {
  const facilitatorDetails = conversation?.sessions?.facilitator_details || {};
  
  return {
    name: facilitatorDetails.title || 'Facilitator',
    details: facilitatorDetails.details || 'Professional session facilitator with expertise in group dynamics and engagement.',
    expertise: facilitatorDetails.expertise_level || 'Expert',
    specialties: facilitatorDetails.specialties || [],
    profilePicture: facilitatorDetails.profile_picture || null,
    personalityTraits: facilitatorDetails.personality_traits || ['engaging', 'supportive', 'insightful']
  };
}

export function extractSessionContext(conversation: any, participants: any[]) {
  const sessions = conversation?.sessions || {};
  
  return {
    title: sessions.title || 'Discussion Session',
    objective: sessions.objective || 'facilitate meaningful discussion and engagement',
    sessionType: sessions.session_type || 'workshop',
    participantCount: participants?.length || conversation?.participants || 1,
    participantDescription: conversation?.participant_description || 'participants',
    duration: sessions.duration || 60,
    tags: sessions.tags || []
  };
}

export function createContextualSystemPrompt(
  facilitatorContext: any,
  sessionContext: any,
  conversationProgress: string = 'early',
  isSessionStart: boolean = false
): string {
  let basePrompt = `You are ${facilitatorContext.name}, an expert facilitator conducting a ${sessionContext.sessionType} titled "${sessionContext.title}".

FACILITATOR BACKGROUND:
- Name: ${facilitatorContext.name}
- Expertise: ${facilitatorContext.expertise} level
- Background: ${facilitatorContext.details}
- Specialties: ${facilitatorContext.specialties.join(', ') || 'group facilitation and engagement'}
- Personality: ${facilitatorContext.personalityTraits.join(', ')}

SESSION CONTEXT:
- Title: ${sessionContext.title}
- Objective: ${sessionContext.objective}
- Type: ${sessionContext.sessionType}
- Participants: ${sessionContext.participantCount} ${sessionContext.participantDescription}
- Duration: ${sessionContext.duration} minutes`;

  if (isSessionStart) {
    basePrompt += `\n\nSESSION START INSTRUCTIONS:
- Generate a warm, engaging welcome message that sets the tone
- Introduce yourself naturally using your background and expertise
- Clearly state the session objective and what participants can expect
- Encourage initial participation and sharing
- Create psychological safety for open discussion
- Use your expertise to frame the discussion appropriately`;
  } else {
    // Instructions for subsequent messages based on conversation progress
    switch (conversationProgress) {
      case 'early':
        basePrompt += `\n\nEARLY STAGE FACILITATION:
- Encourage initial sharing and build on participant contributions
- Ask open-ended questions to explore ideas further
- Help participants connect their thoughts to the session objective
- Create momentum and engagement
- Use your expertise to guide the discussion naturally`;
        break;
        
      case 'middle':
        basePrompt += `\n\nMIDDLE STAGE FACILITATION:
- Synthesize key themes and insights that have emerged
- Challenge participants to think deeper about the topics
- Draw connections between different viewpoints shared
- Keep the discussion focused on the session objective
- Use your expertise to add valuable insights and perspectives`;
        break;
        
      case 'concluding':
        basePrompt += `\n\nCONCLUDING STAGE FACILITATION:
- Help participants reflect on key learnings and insights
- Summarize important themes and takeaways
- Encourage action planning and next steps
- Thank participants for their contributions
- Provide closure while reinforcing the session's value`;
        break;
    }
  }

  basePrompt += `\n\nFACILITATION STYLE:
- Maintain your professional expertise while being approachable and engaging
- Ask thoughtful questions that deepen the discussion
- Acknowledge and build upon participant contributions
- Guide the conversation toward meaningful outcomes
- Use language appropriate for ${sessionContext.participantDescription}
- Balance structure with flexibility to follow natural conversation flow
- Encourage participation from quieter members when appropriate

RESPONSE GUIDELINES:
- Keep responses conversational and engaging (2-4 sentences typically)
- Always tie back to the session objective when relevant
- Use your expertise to add value without dominating
- Ask questions that invite deeper thinking and sharing
- Maintain enthusiasm and positive energy throughout`;

  return basePrompt;
}

export function analyzeConversationThemes(messages: any[]): string[] {
  // Simple theme extraction based on message content
  const themes: string[] = [];
  const participantMessages = messages.filter(msg => msg.role === 'user');
  
  // Extract key words and phrases from participant messages
  participantMessages.forEach(msg => {
    const content = typeof msg.content === 'string' ? msg.content : 
                   (typeof msg.content === 'object' && msg.content?.text) ? msg.content.text : '';
    
    // Simple keyword extraction (in a real implementation, you might use more sophisticated NLP)
    const words = content.toLowerCase().split(' ');
    const importantWords = words.filter(word => 
      word.length > 4 && 
      !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were', 'said', 'what', 'when', 'where', 'would', 'could', 'should'].includes(word)
    );
    
    themes.push(...importantWords.slice(0, 3)); // Take first 3 important words per message
  });
  
  // Return unique themes, limited to top 5
  return [...new Set(themes)].slice(0, 5);
}

export function assessParticipationBalance(messages: any[], participantCount: number): {
  activeParticipants: number;
  quietParticipants: number;
  participationBalance: 'balanced' | 'uneven' | 'dominated';
} {
  const participantMessages = messages.filter(msg => msg.role === 'user');
  const participantCounts: { [key: string]: number } = {};
  
  participantMessages.forEach(msg => {
    const participant = msg.participant || msg.name || 'unknown';
    participantCounts[participant] = (participantCounts[participant] || 0) + 1;
  });
  
  const activeParticipants = Object.keys(participantCounts).length;
  const quietParticipants = participantCount - activeParticipants;
  
  // Determine balance
  let participationBalance: 'balanced' | 'uneven' | 'dominated' = 'balanced';
  
  if (activeParticipants === 0) {
    participationBalance = 'uneven';
  } else if (activeParticipants < participantCount * 0.5) {
    participationBalance = 'uneven';
  } else {
    const messageCounts = Object.values(participantCounts);
    const maxMessages = Math.max(...messageCounts);
    const avgMessages = messageCounts.reduce((a, b) => a + b, 0) / messageCounts.length;
    
    if (maxMessages > avgMessages * 2) {
      participationBalance = 'dominated';
    }
  }
  
  return {
    activeParticipants,
    quietParticipants,
    participationBalance
  };
}
