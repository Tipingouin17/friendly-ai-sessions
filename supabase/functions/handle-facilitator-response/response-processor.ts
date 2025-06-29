
import { 
  analyzeParticipation, 
  extractUserTopics 
} from "../_shared/message-analysis.ts";
import { 
  generateOpenAIResponse,
  prepareOpenAIPrompt,
  prepareOpenAIContent
} from "../_shared/openai-integration.ts";
import { 
  generateEnhancedTemplateResponse 
} from "../_shared/response-generation.ts";
import { 
  determineSessionProgress, 
  getFacilitatorAvatar,
  getLanguageCode 
} from "../_shared/context-analyzer.ts";
import { FACILITATION_STRATEGIES } from "../_shared/facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "../_shared/report-templates.ts";
import { 
  pruneMessagesToFitContext,
  MAX_TOKEN_ESTIMATE
} from "../_shared/context-management.ts";
import { createResponseMetrics, trackSessionMetrics } from "./metrics-handler.ts";

/**
 * Process the request and generate a facilitator response with enhanced context awareness
 */
export async function processResponse(
  supabase: any,
  messages: any[],
  conversationId: number,
  conversation: any,
  participants: any[],
  generateReport: boolean,
  wrapUpSession?: boolean,
  sessionStart?: boolean,
  aggregateResponses?: boolean,
  responseContext?: any,
  sessionContext?: any
) {
  // Track participation metrics with enhanced participant awareness
  const participantStats = analyzeParticipation(messages, participants || []);
  
  // Extract participant description and count information
  const participantCount = conversation?.participants || participants?.length || 0;
  const participantDescription = conversation?.participant_description || "";
  
  // Extract and process language setting
  let sessionLanguage = conversation?.language || "en";
  if (sessionLanguage !== "en" && sessionLanguage !== "es" && sessionLanguage !== "fr" && 
      sessionLanguage !== "de" && sessionLanguage !== "zh" && sessionLanguage !== "ar") {
    sessionLanguage = getLanguageCode(sessionLanguage);
  }
  
  console.log(`Enhanced context - Participants: ${participantCount}, Description: ${participantDescription}, Language: ${sessionLanguage}`);
  
  // FIXED: Enhanced facilitator context with correct data access paths
  const facilitatorContext = {
    name: conversation?.sessions?.facilitator_details?.title || 
          conversation?.facilitator?.title || 
          'Facilitator',
    details: conversation?.sessions?.facilitator_details?.details || 
             conversation?.facilitator?.details || 
             conversation?.sessions?.facilitator_details?.description ||
             conversation?.facilitator?.description || '',
    expertise: conversation?.sessions?.facilitator_details?.expertise_level || 
               conversation?.facilitator?.expertise_level || 
               'Professional facilitator',
    specialties: conversation?.sessions?.facilitator_details?.specialties || 
                 conversation?.facilitator?.specialties || [],
    profilePicture: conversation?.sessions?.facilitator_details?.profile_picture || 
                    conversation?.facilitator?.profile_picture || null
  };

  console.log('FIXED: Enhanced facilitator context with proper data paths:', facilitatorContext);

  // Get OpenAI API key
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  // Response generation setup
  let responseContent = "";
  let responseMetrics = createResponseMetrics('template', 0, participantStats.participationBalance);
  
  // Determine session progress with context awareness
  let sessionProgress = determineSessionProgress(messages, conversation?.sessions?.duration_minutes);
  if (wrapUpSession) {
    console.log("🔄 Admin triggered wrap up - forcing session progress to 'concluding'");
    sessionProgress = "concluding";
  }
  
  if (sessionStart) {
    console.log("🚀 Session start detected - generating contextual welcome message with FULL facilitator context");
    sessionProgress = "early";
  }

  if (aggregateResponses) {
    console.log("🔄 Aggregating participant responses for facilitator synthesis");
    sessionProgress = "active";
  }
  
  // Get the appropriate facilitator avatar with enhanced processing
  let facilitatorAvatar = getFacilitatorAvatar(conversation);
  
  if (facilitatorAvatar && typeof facilitatorAvatar === 'string') {
    facilitatorAvatar = facilitatorAvatar.replace(/([^:])\/\//g, '$1/');
    
    if (!facilitatorAvatar.includes('crossorigin=anonymous') && 
        (facilitatorAvatar.startsWith('http') || facilitatorAvatar.includes('supabase.co'))) {
      facilitatorAvatar += (facilitatorAvatar.includes('?') ? '&' : '?') + 'crossorigin=anonymous';
    }
  }
  
  // Use OpenAI with enhanced context if available
  if (openaiApiKey && conversation?.sessions) {
    try {
      console.log("Using enhanced OpenAI integration with COMPLETE session and facilitator context");
      const startTime = performance.now();
      
      // FIXED: Construct enhanced session context with proper objective access
      const sessionType = conversation.sessions.session_type || "workshop";
      const sessionObjective = conversation.sessions.objective || "facilitate meaningful discussion";
      const sessionTitle = conversation.sessions.title || "Discussion Session";
      
      console.log(`FIXED: Session context - Type: ${sessionType}, Objective: ${sessionObjective}, Title: ${sessionTitle}`);
      console.log(`FIXED: Participant context - Count: ${participantCount}, Description: ${participantDescription}`);
      
      // Get relevant facilitation strategies
      const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
      
      // Prune messages to fit context window
      const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE);
      
      // Extract user questions and topics
      const userTopics = extractUserTopics(prunedMessages);
      
      // FIXED: Prepare enhanced OpenAI prompt with complete facilitator and session context
      let basePrompt = prepareEnhancedOpenAIPrompt(
        conversation, 
        sessionProgress, 
        participantCount, 
        participantDescription, 
        strategies,
        facilitatorContext,
        sessionContext
      );
      
      // ENHANCED: Add session start instruction with complete context
      if (sessionStart) {
        basePrompt += `\n\nCRITICAL SESSION START CONTEXT: Generate an engaging welcome message that:
1. Introduces yourself as ${facilitatorContext.name} with your specific expertise: ${facilitatorContext.details}
2. Acknowledges the ${participantCount} ${participantDescription} who have joined this session
3. Clearly explains the session objective: "${sessionObjective}"
4. References your specialties: ${facilitatorContext.specialties.join(', ') || 'facilitation and guidance'}
5. Uses language and examples specifically appropriate for ${participantDescription}
6. Creates an inclusive atmosphere that matches the participant background and expertise level
7. Sets clear expectations for participation based on the session type: ${sessionType}
8. Shows enthusiasm for working with this specific group: ${participantDescription}
9. Mentions how your background (${facilitatorContext.details}) will help achieve: ${sessionObjective}`;
      }
      
      // Add response aggregation instruction
      if (aggregateResponses && responseContext) {
        basePrompt += `\n\nIMPORTANT RESPONSE AGGREGATION: You are ${facilitatorContext.name} synthesizing responses from ${responseContext.totalResponses} ${participantDescription}. Please:
1. Acknowledge the diverse perspectives shared by the ${participantDescription}
2. Identify common themes and interesting contrasts in their responses
3. Build upon their contributions with follow-up questions appropriate for ${participantDescription}
4. Encourage deeper exploration of topics relevant to: ${sessionObjective}
5. Guide the discussion toward the session objectives using your expertise: ${facilitatorContext.details}
6. Maintain your facilitator persona as ${facilitatorContext.name} throughout`;
      }
      
      // Add wrap up instruction if requested
      if (wrapUpSession) {
        basePrompt += `\n\nSESSION WRAP-UP: As ${facilitatorContext.name}, please wrap up this session for the ${participantCount} ${participantDescription}:
1. Acknowledge that the session is coming to a close
2. Summarize key insights relevant to the objective: ${sessionObjective}
3. Highlight the most valuable contributions made by the ${participantDescription}
4. Ask for final thoughts specifically related to: ${sessionObjective}
5. Provide a meaningful conclusion that ties back to the original goals and your expertise`;
      }
      
      // Add language instruction
      if (sessionLanguage && sessionLanguage !== "en") {
        const languageName = 
          sessionLanguage === "es" ? "Spanish" : 
          sessionLanguage === "fr" ? "French" : 
          sessionLanguage === "de" ? "German" :
          sessionLanguage === "zh" ? "Chinese" :
          sessionLanguage === "ar" ? "Arabic" : sessionLanguage;
        
        basePrompt += `\n\nIMPORTANT: Please respond in ${languageName} language only.`;
      }
      
      // FIXED: Prepare enhanced content for OpenAI with complete context
      const promptContent = prepareEnhancedOpenAIContent(
        prunedMessages.slice(-15), 
        participantCount, 
        participantDescription,
        userTopics,
        participantStats,
        participants,
        generateReport,
        aggregateResponses,
        responseContext,
        facilitatorContext,
        sessionObjective,
        sessionType
      );
      
      // Call OpenAI with enhanced context
      const openAIResult = await generateOpenAIResponse(
        openaiApiKey,
        basePrompt,
        promptContent,
        generateReport
      );
      
      const endTime = performance.now();
      
      if (openAIResult.success) {
        responseContent = openAIResult.content;
        console.log("FIXED: Enhanced OpenAI response generated with complete facilitator context:", responseContent.substring(0, 100) + "...");
        
        responseMetrics = createResponseMetrics('ai', Math.round(endTime - startTime), participantStats.participationBalance);
        
        // Save enhanced metrics to database with complete context
        await trackSessionMetrics(
          supabase,
          conversationId,
          responseMetrics, 
          responseContent,
          userTopics,
          participantStats,
          participantCount,
          participantDescription,
          sessionLanguage,
          sessionStart ? 'session_start' : 
          (aggregateResponses ? 'response_aggregation' : 
          (wrapUpSession ? 'session_wrap_up' : 
          (generateReport ? 'report_generation' : 'facilitator_response'))),
          facilitatorContext,
          sessionObjective
        );
      } else {
        console.error("Enhanced OpenAI API error:", openAIResult.error);
        // Fall back to enhanced template response with complete context
        responseContent = generateEnhancedTemplateResponse(
          prunedMessages, 
          generateReport, 
          conversation, 
          sessionProgress, 
          participantStats, 
          userTopics,
          participantCount,
          participantDescription,
          facilitatorContext,
          sessionObjective
        );
      }
    } catch (error) {
      console.error("Error in enhanced OpenAI processing:", error instanceof Error ? error.message : "Unknown error");
      
      // Fall back to enhanced template response with complete context
      responseContent = generateEnhancedTemplateResponse(
        messages, 
        generateReport, 
        conversation, 
        sessionProgress, 
        participantStats, 
        extractUserTopics(messages),
        participantCount,
        participantDescription,
        facilitatorContext,
        sessionObjective
      );
    }
  } else {
    console.log("Using enhanced template-based response generation with complete context");
    
    responseContent = generateEnhancedTemplateResponse(
      messages, 
      generateReport, 
      conversation, 
      sessionProgress, 
      participantStats, 
      extractUserTopics(messages),
      participantCount,
      participantDescription,
      facilitatorContext,
      sessionObjective
    );
  }

  // Create response object with enhanced metrics and complete context
  return {
    id: `resp-${Date.now()}`,
    content: responseContent,
    is_report: generateReport,
    metrics: responseMetrics,
    avatar: facilitatorAvatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
    facilitator_context: facilitatorContext
  };
}

/**
 * FIXED: Prepare enhanced OpenAI prompt with complete facilitator and session context
 */
function prepareEnhancedOpenAIPrompt(
  conversation: any,
  sessionProgress: string,
  participantCount: number,
  participantDescription: string,
  strategies: any,
  facilitatorContext: any,
  sessionContext?: any
) {
  const sessionType = conversation?.sessions?.session_type || "workshop";
  const sessionObjective = conversation?.sessions?.objective || "facilitate a productive discussion";
  const sessionTitle = conversation?.sessions?.title || "Discussion Session";
  const languageCode = conversation?.language || "en";
  
  let languageInstruction = "";
  if (languageCode && languageCode !== "en") {
    const displayLanguage = 
      languageCode === "es" ? "Spanish" : 
      languageCode === "fr" ? "French" : 
      languageCode === "de" ? "German" : 
      languageCode === "zh" ? "Chinese" : 
      languageCode === "ar" ? "Arabic" : languageCode;
    
    languageInstruction = `\n\nIMPORTANT: Please respond in ${displayLanguage} language only.`;
  }
  
  return `You are ${facilitatorContext.name}, an expert facilitator leading a ${sessionType} session titled "${sessionTitle}".

FACILITATOR PROFILE (CRITICAL - USE THIS CONTEXT):
- Name: ${facilitatorContext.name}
- Background & Expertise: ${facilitatorContext.details || 'Professional session facilitator'}
- Expertise Level: ${facilitatorContext.expertise}
- Specialties: ${facilitatorContext.specialties.join(', ') || 'facilitation and guidance'}
- Your unique value: ${facilitatorContext.details}

SESSION CONTEXT (CRITICAL - REFERENCE THESE DETAILS):
- Objective: ${sessionObjective}
- Current progress: ${sessionProgress} stage
- Session type: ${sessionType}
- Title: ${sessionTitle}

PARTICIPANT INFORMATION (CRITICAL - TAILOR TO THIS GROUP):
- Number of participants: ${participantCount}
- Participant type: ${participantDescription || "General participants"}
- Your approach: Adapt your facilitation style specifically for ${participantDescription}
- Use language, examples, and references appropriate for ${participantDescription}

FACILITATION APPROACH AS ${facilitatorContext.name}:
- Leverage your background: ${facilitatorContext.details}
- Use these techniques: ${strategies.techniques.join(", ")}
- For redirection, use: ${strategies.redirections.join(" Or, ")}
- Always maintain your identity as ${facilitatorContext.name}
- Reference your specialties when relevant: ${facilitatorContext.specialties.join(', ')}

ADAPTIVE STRATEGIES FOR ${participantDescription}:
- Small groups (1-3): Direct, personal engagement with questions suited to ${participantDescription}
- Medium groups (4-8): Balance individual contributions with group synthesis for ${participantDescription}
- Large groups (9+): Structured sharing with clear facilitation guidance for ${participantDescription}

PARTICIPANT-CENTERED APPROACH (ESSENTIAL):
- Always remember you're working with ${participantDescription}
- Tailor all language and examples to match their context and expertise
- Reference the session objective: ${sessionObjective} in relation to their needs
- Build on their contributions meaningfully as ${facilitatorContext.name}
- Create psychological safety appropriate for ${participantDescription}
- Balance participation across all ${participantCount} ${participantDescription}

AUTHENTIC FACILITATION AS ${facilitatorContext.name}:
- Respond authentically as ${facilitatorContext.name}, not as a generic AI
- Reference your specific background: ${facilitatorContext.details}
- Show genuine interest in ${participantDescription} contributions
- Guide toward the objective: ${sessionObjective} using your expertise
- Demonstrate how your background helps achieve: ${sessionObjective}${languageInstruction}`;
}

/**
 * FIXED: Prepare enhanced OpenAI content with complete context awareness
 */
function prepareEnhancedOpenAIContent(
  recentMessages: any[],
  participantCount: number, 
  participantDescription: string,
  userTopics: string[],
  participantStats: any,
  participants: any[],
  generateReport: boolean,
  aggregateResponses?: boolean,
  responseContext?: any,
  facilitatorContext?: any,
  sessionObjective?: string,
  sessionType?: string
) {
  let promptContent = `CURRENT SESSION STATE WITH COMPLETE CONTEXT:\n\n`;
  
  // Add enhanced participant context
  promptContent += `PARTICIPANT CONTEXT (CRITICAL):\n`;
  promptContent += `- Total participants: ${participantCount}\n`;
  promptContent += `- Participant profile: ${participantDescription || "General participants"}\n`;
  promptContent += `- Participation patterns: ${participantStats.summary}\n`;
  promptContent += `- Session type: ${sessionType}\n`;
  promptContent += `- Session objective: ${sessionObjective}\n\n`;
  
  // Add complete facilitator context
  if (facilitatorContext) {
    promptContent += `YOUR FACILITATOR ROLE (ESSENTIAL):\n`;
    promptContent += `- You are: ${facilitatorContext.name}\n`;
    promptContent += `- Your background: ${facilitatorContext.details}\n`;
    promptContent += `- Your expertise: ${facilitatorContext.expertise}\n`;
    promptContent += `- Your specialties: ${facilitatorContext.specialties.join(', ')}\n`;
    promptContent += `- Working with: ${participantDescription}\n`;
    promptContent += `- Session goal: ${sessionObjective}\n\n`;
  }
  
  // Add response aggregation context with complete details
  if (aggregateResponses && responseContext) {
    promptContent += `PARTICIPANT RESPONSES TO SYNTHESIZE (${participantDescription}):\n`;
    responseContext.participantResponses.forEach((response: any, index: number) => {
      const participantInfo = participants?.find(p => `P${p.participant_id}` === response.participant);
      const participantName = participantInfo ? participantInfo.name : response.participant;
      promptContent += `${index + 1}. ${participantName} (${participantDescription}): ${response.content}\n`;
    });
    promptContent += `\nTotal responses from ${participantDescription}: ${responseContext.totalResponses}\n`;
    promptContent += `Your task as ${facilitatorContext?.name}: Synthesize these responses in context of: ${sessionObjective}\n\n`;
  }
  
  // Add key topics with context
  if (userTopics.length > 0) {
    promptContent += `KEY DISCUSSION TOPICS (relevant to ${sessionObjective}): ${userTopics.join(", ")}\n\n`;
  }
  
  // Add recent conversation context with participant awareness
  if (recentMessages.length > 0) {
    promptContent += `RECENT CONVERSATION (with ${participantDescription}):\n`;
    recentMessages.forEach(msg => {
      if (msg.sender === 'user') {
        const participantInfo = participants?.find(p => `P${p.participant_id}` === msg.participant);
        const participantName = participantInfo ? participantInfo.name : (msg.participant || 'Participant');
        promptContent += `${participantName} (${participantDescription}): ${msg.content}\n`;
      } else if (msg.sender === 'assistant' && !msg.isReport) {
        promptContent += `${facilitatorContext?.name || 'Facilitator'}: ${msg.content}\n`;
      }
    });
    promptContent += '\n';
  }
  
  // Add specific instructions based on context with complete details
  if (generateReport) {
    promptContent += `GENERATE COMPREHENSIVE SESSION REPORT AS ${facilitatorContext?.name}:\n`;
    promptContent += `- Analyze discussion patterns among ${participantDescription}\n`;
    promptContent += `- Include participant engagement and contributions specific to ${participantDescription}\n`;
    promptContent += `- Provide actionable recommendations for ${participantDescription}\n`;
    promptContent += `- Reference how the objective "${sessionObjective}" was addressed\n`;
    promptContent += `- Use your expertise (${facilitatorContext?.details}) in the analysis\n`;
  } else if (aggregateResponses) {
    promptContent += `SYNTHESIZE RESPONSES AS ${facilitatorContext?.name} FOR ${participantDescription}:\n`;
    promptContent += `1. Acknowledge the diverse perspectives shared by ${participantDescription}\n`;
    promptContent += `2. Identify patterns, themes, and contrasts relevant to ${sessionObjective}\n`;
    promptContent += `3. Build upon their contributions with follow-up questions appropriate for ${participantDescription}\n`;
    promptContent += `4. Guide toward deeper exploration using your background: ${facilitatorContext?.details}\n`;
    promptContent += `5. Maintain engagement appropriate for ${participantDescription} working toward: ${sessionObjective}\n`;
  } else {
    promptContent += `PROVIDE THOUGHTFUL FACILITATION AS ${facilitatorContext?.name}:\n`;
    promptContent += `1. Respond authentically as ${facilitatorContext?.name} working with ${participantDescription}\n`;
    promptContent += `2. Build on contributions from ${participantDescription} meaningfully\n`;
    promptContent += `3. Guide discussion toward: ${sessionObjective}\n`;
    promptContent += `4. Ask engaging questions appropriate for ${participantDescription}\n`;
    promptContent += `5. Use your expertise (${facilitatorContext?.details}) to add value\n`;
    promptContent += `6. Encourage balanced participation from all ${participantCount} ${participantDescription}\n`;
  }
  
  return promptContent;
}
