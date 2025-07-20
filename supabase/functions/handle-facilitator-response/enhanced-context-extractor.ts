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
    tags: sessions.tags || [],
    language: conversation?.language || 'en'
  };
}

export function createLanguageInstruction(language: string, participantDescription?: string): string {
  if (!language || language === 'en') {
    return '';
  }

  const languageInstructions: { [key: string]: string } = {
    'fr': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in French. All your responses must be in perfect French, using appropriate terminology for ${participantDescription || 'participants'}. Do not mix languages or use English words unless they are commonly used French technical terms.`,
    'es': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in Spanish. All your responses must be in perfect Spanish, using appropriate terminology for ${participantDescription || 'participants'}.`,
    'de': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in German. All your responses must be in perfect German, using appropriate terminology for ${participantDescription || 'participants'}.`,
    'it': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in Italian. All your responses must be in perfect Italian, using appropriate terminology for ${participantDescription || 'participants'}.`,
    'pt': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in Portuguese. All your responses must be in perfect Portuguese, using appropriate terminology for ${participantDescription || 'participants'}.`,
    'nl': `LANGUAGE REQUIREMENT - CRITICAL: You MUST respond ONLY in Dutch. All your responses must be in perfect Dutch, using appropriate terminology for ${participantDescription || 'participants'}.`
  };

  return languageInstructions[language] || '';
}

export function createParticipantSpecificContext(participantDescription: string, sessionType: string, language: string): string {
  const participantContext: { [key: string]: { [lang: string]: string } } = {
    'farmer': {
      'fr': `Vous vous adressez à des agriculteurs. Utilisez un vocabulaire agricole approprié et des exemples concrets liés à l'agriculture, la gestion des cultures, l'élevage, la gestion des ressources naturelles, et les défis du secteur agricole. Références aux saisons, cycles de culture, marchés agricoles, et innovations en agriculture.`,
      'en': `You are addressing farmers. Use appropriate agricultural vocabulary and concrete examples related to farming, crop management, livestock, natural resource management, and agricultural sector challenges. Reference seasons, crop cycles, agricultural markets, and farming innovations.`
    },
    'teacher': {
      'fr': `Vous vous adressez à des enseignants. Utilisez un vocabulaire pédagogique et des exemples liés à l'éducation, la gestion de classe, les méthodes d'enseignement, l'évaluation des élèves, et les défis éducatifs. Références aux programmes scolaires, développement des élèves, et innovations pédagogiques.`,
      'en': `You are addressing teachers. Use pedagogical vocabulary and examples related to education, classroom management, teaching methods, student assessment, and educational challenges. Reference curricula, student development, and educational innovations.`
    },
    'healthcare': {
      'fr': `Vous vous adressez à des professionnels de santé. Utilisez un vocabulaire médical approprié et des exemples liés aux soins aux patients, aux procédures médicales, à la gestion des établissements de santé, et aux défis du secteur de la santé.`,
      'en': `You are addressing healthcare professionals. Use appropriate medical vocabulary and examples related to patient care, medical procedures, healthcare facility management, and healthcare sector challenges.`
    },
    'entrepreneur': {
      'fr': `Vous vous adressez à des entrepreneurs. Utilisez un vocabulaire business et des exemples liés à la création d'entreprise, la gestion d'équipe, le développement de produits, le marketing, et les défis entrepreneuriaux.`,
      'en': `You are addressing entrepreneurs. Use business vocabulary and examples related to business creation, team management, product development, marketing, and entrepreneurial challenges.`
    }
  };

  const defaultContext = {
    'fr': `Vous vous adressez à des ${participantDescription}. Adaptez votre langage et vos exemples à leur domaine d'expertise et leurs défis spécifiques.`,
    'en': `You are addressing ${participantDescription}. Adapt your language and examples to their domain of expertise and specific challenges.`
  };

  const contextKey = participantDescription.toLowerCase();
  const langKey = language || 'en';
  
  return participantContext[contextKey]?.[langKey] || 
         defaultContext[langKey] || 
         defaultContext['en'];
}

export function createSessionTypeContext(sessionType: string, objective: string, language: string): string {
  const sessionContexts: { [key: string]: { [lang: string]: string } } = {
    'workshop': {
      'fr': `Ceci est un atelier pratique. Encouragez la participation active, les exercices pratiques, et l'application concrète des concepts. Objectif: ${objective}`,
      'en': `This is a practical workshop. Encourage active participation, practical exercises, and concrete application of concepts. Objective: ${objective}`
    },
    'seminar': {
      'fr': `Ceci est un séminaire éducatif. Privilégiez le partage de connaissances, les discussions approfondies, et l'exploration théorique. Objectif: ${objective}`,
      'en': `This is an educational seminar. Focus on knowledge sharing, in-depth discussions, and theoretical exploration. Objective: ${objective}`
    },
    'training': {
      'fr': `Ceci est une formation. Concentrez-vous sur le développement de compétences, l'apprentissage progressif, et la pratique guidée. Objectif: ${objective}`,
      'en': `This is a training session. Focus on skill development, progressive learning, and guided practice. Objective: ${objective}`
    }
  };

  const langKey = language || 'en';
  return sessionContexts[sessionType]?.[langKey] || 
         sessionContexts['workshop'][langKey] || 
         sessionContexts['workshop']['en'];
}

export function createContextualSystemPrompt(
  facilitatorContext: any,
  sessionContext: any,
  conversationProgress: string = 'early',
  isSessionStart: boolean = false
): string {
  const language = sessionContext.language || 'en';
  const languageInstruction = createLanguageInstruction(language, sessionContext.participantDescription);
  const participantContext = createParticipantSpecificContext(
    sessionContext.participantDescription, 
    sessionContext.sessionType, 
    language
  );
  const sessionTypeContext = createSessionTypeContext(
    sessionContext.sessionType, 
    sessionContext.objective, 
    language
  );

  let basePrompt = '';

  // CRITICAL: Language instruction must be first and prominent
  if (languageInstruction) {
    basePrompt += `${languageInstruction}\n\n`;
  }

  basePrompt += `You are ${facilitatorContext.name}, an expert facilitator conducting a ${sessionContext.sessionType} titled "${sessionContext.title}".

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
- Duration: ${sessionContext.duration} minutes

PARTICIPANT-SPECIFIC CONTEXT:
${participantContext}

SESSION TYPE CONTEXT:
${sessionTypeContext}`;

  if (isSessionStart) {
    const sessionStartInstructions = language === 'fr' ? 
      `\n\nINSTRUCTIONS DE DÉBUT DE SESSION:
- Générez un message d'accueil chaleureux et engageant qui donne le ton
- Présentez-vous naturellement en utilisant votre expertise et votre expérience
- Énoncez clairement l'objectif de la session et ce que les participants peuvent attendre
- Encouragez la participation initiale et le partage
- Créez un environnement psychologiquement sûr pour une discussion ouverte
- Utilisez votre expertise pour encadrer la discussion de manière appropriée` :
      `\n\nSESSION START INSTRUCTIONS:
- Generate a warm, engaging welcome message that sets the tone
- Introduce yourself naturally using your background and expertise
- Clearly state the session objective and what participants can expect
- Encourage initial participation and sharing
- Create psychological safety for open discussion
- Use your expertise to frame the discussion appropriately`;
    
    basePrompt += sessionStartInstructions;
  } else {
    // Instructions for subsequent messages based on conversation progress
    const progressInstructions = {
      'early': language === 'fr' ? 
        `\n\nFACILITATION EN DÉBUT DE SESSION:
- Encouragez le partage initial et développez les contributions des participants
- Posez des questions ouvertes pour explorer davantage les idées
- Aidez les participants à connecter leurs réflexions à l'objectif de la session
- Créez un élan et de l'engagement
- Utilisez votre expertise pour guider naturellement la discussion` :
        `\n\nEARLY STAGE FACILITATION:
- Encourage initial sharing and build on participant contributions
- Ask open-ended questions to explore ideas further
- Help participants connect their thoughts to the session objective
- Create momentum and engagement
- Use your expertise to guide the discussion naturally`,
      
      'middle': language === 'fr' ? 
        `\n\nFACILITATION EN MILIEU DE SESSION:
- Synthétisez les thèmes et insights clés qui ont émergé
- Défiez les participants à réfléchir plus profondément sur les sujets
- Établissez des connexions entre les différents points de vue partagés
- Maintenez la discussion centrée sur l'objectif de la session
- Utilisez votre expertise pour ajouter des perspectives et insights précieux` :
        `\n\nMIDDLE STAGE FACILITATION:
- Synthesize key themes and insights that have emerged
- Challenge participants to think deeper about the topics
- Draw connections between different viewpoints shared
- Keep the discussion focused on the session objective
- Use your expertise to add valuable insights and perspectives`,
      
      'concluding': language === 'fr' ? 
        `\n\nFACILITATION EN FIN DE SESSION:
- Aidez les participants à réfléchir sur les apprentissages et insights clés
- Résumez les thèmes et conclusions importants
- Encouragez la planification d'actions et les prochaines étapes
- Remerciez les participants pour leurs contributions
- Fournissez une clôture tout en renforçant la valeur de la session` :
        `\n\nCONCLUDING STAGE FACILITATION:
- Help participants reflect on key learnings and insights
- Summarize important themes and takeaways
- Encourage action planning and next steps
- Thank participants for their contributions
- Provide closure while reinforcing the session's value`
    };
    
    basePrompt += progressInstructions[conversationProgress as keyof typeof progressInstructions] || progressInstructions['early'];
  }

  const facilitationStyleInstructions = language === 'fr' ? 
    `\n\nSTYLE DE FACILITATION:
- Maintenez votre expertise professionnelle tout en étant accessible et engageant
- Posez des questions réfléchies qui approfondissent la discussion
- Reconnaissez et développez les contributions des participants
- Guidez la conversation vers des résultats significatifs
- Utilisez un langage approprié pour ${sessionContext.participantDescription}
- Équilibrez structure et flexibilité pour suivre le flux naturel de la conversation
- Encouragez la participation des membres plus silencieux quand approprié

DIRECTIVES DE RÉPONSE:
- Gardez les réponses conversationnelles et engageantes (2-4 phrases typiquement)
- Toujours faire le lien avec l'objectif de la session quand pertinent
- Utilisez votre expertise pour ajouter de la valeur sans dominer
- Posez des questions qui invitent à une réflexion et un partage plus profonds
- Maintenez l'enthousiasme et l'énergie positive tout au long` :
    `\n\nFACILITATION STYLE:
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

  basePrompt += facilitationStyleInstructions;

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
