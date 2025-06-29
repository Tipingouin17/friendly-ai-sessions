
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
  
  // Enhanced facilitator context
  const facilitatorContext = {
    name: conversation?.sessions?.facilitator_details?.title || 'Facilitator',
    details: conversation?.sessions?.facilitator_details?.details || '',
    expertise: conversation?.sessions?.facilitator_details?.profile_picture ? 'Professional facilitator' : 'AI facilitator'
  };

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
    console.log("🚀 Session start detected - generating contextual welcome message");
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
  
  console.log('Enhanced facilitator context:', facilitatorContext);
  console.log('Facilitator avatar for response:', facilitatorAvatar);
  
  // Use OpenAI with enhanced context if available
  if (openaiApiKey && conversation?.sessions) {
    try {
      console.log("Using enhanced OpenAI integration with full session context");
      const startTime = performance.now();
      
      // Construct enhanced session context
      const sessionType = conversation.sessions.session_type || "workshop";
      const sessionObjective = conversation.sessions.objective || "facilitate meaningful discussion";
      const sessionTitle = conversation.sessions.title || "Discussion Session";
      
      // Get relevant facilitation strategies
      const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
      
      // Prune messages to fit context window
      const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE);
      
      // Extract user questions and topics
      const userTopics = extractUserTopics(prunedMessages);
      
      // Prepare enhanced OpenAI prompt with full context
      let basePrompt = prepareEnhancedOpenAIPrompt(
        conversation, 
        sessionProgress, 
        participantCount, 
        participantDescription, 
        strategies,
        facilitatorContext,
        sessionContext
      );
      
      // Add session start instruction with enhanced context
      if (sessionStart) {
        basePrompt += `\n\nIMPORTANT SESSION START: Generate an engaging welcome message that:
1. Introduces yourself as ${facilitatorContext.name} with your expertise: ${facilitatorContext.details}
2. Acknowledges the ${participantCount} ${participantDescription} who have joined
3. Clearly explains the session objective: ${sessionObjective}
4. Asks engaging, personalized questions based on the participant description
5. Creates an inclusive atmosphere that matches the participant background
6. Sets clear expectations for participation and engagement
7. Uses language and examples appropriate for ${participantDescription}`;
      }
      
      // Add response aggregation instruction
      if (aggregateResponses && responseContext) {
        basePrompt += `\n\nIMPORTANT RESPONSE AGGREGATION: You are synthesizing responses from ${responseContext.totalResponses} participants. Please:
1. Acknowledge the diverse perspectives shared by participants
2. Identify common themes and interesting contrasts in their responses
3. Build upon their contributions with follow-up questions
4. Encourage deeper exploration of the topics they've raised
5. Guide the discussion toward the session objectives
6. Maintain facilitator persona as ${facilitatorContext.name}`;
      }
      
      // Add wrap up instruction if requested
      if (wrapUpSession) {
        basePrompt += `\n\nIMPORTANT SESSION WRAP-UP: The session admin has requested you to wrap up. Please:
1. Acknowledge that the session is coming to a close
2. Summarize key insights from the ${participantCount} ${participantDescription}
3. Highlight the most valuable contributions made
4. Ask for final thoughts relevant to the session objective
5. Provide a meaningful conclusion that ties back to the original goals`;
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
      
      // Prepare enhanced content for OpenAI
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
        facilitatorContext
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
        console.log("Enhanced OpenAI response generated:", responseContent.substring(0, 100) + "...");
        
        responseMetrics = createResponseMetrics('ai', Math.round(endTime - startTime), participantStats.participationBalance);
        
        // Save enhanced metrics to database
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
          (generateReport ? 'report_generation' : 'facilitator_response')))
        );
      } else {
        console.error("Enhanced OpenAI API error:", openAIResult.error);
        // Fall back to enhanced template response
        responseContent = generateEnhancedTemplateResponse(
          prunedMessages, 
          generateReport, 
          conversation, 
          sessionProgress, 
          participantStats, 
          userTopics,
          participantCount,
          participantDescription
        );
      }
    } catch (error) {
      console.error("Error in enhanced OpenAI processing:", error instanceof Error ? error.message : "Unknown error");
      
      // Fall back to enhanced template response
      responseContent = generateEnhancedTemplateResponse(
        messages, 
        generateReport, 
        conversation, 
        sessionProgress, 
        participantStats, 
        extractUserTopics(messages),
        participantCount,
        participantDescription
      );
    }
  } else {
    console.log("Using enhanced template-based response generation");
    
    responseContent = generateEnhancedTemplateResponse(
      messages, 
      generateReport, 
      conversation, 
      sessionProgress, 
      participantStats, 
      extractUserTopics(messages),
      participantCount,
      participantDescription
    );
  }

  // Create response object with enhanced metrics and context
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
 * Prepare enhanced OpenAI prompt with full facilitator and session context
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

FACILITATOR PROFILE:
- Name: ${facilitatorContext.name}
- Background: ${facilitatorContext.details || 'Professional session facilitator'}
- Expertise: ${facilitatorContext.expertise}

SESSION CONTEXT:
- Objective: ${sessionObjective}
- Current progress: ${sessionProgress} stage
- Session type: ${sessionType}

PARTICIPANT INFORMATION:
- Number of participants: ${participantCount}
- Description: ${participantDescription || "General participants"}
- Expected engagement level: Adapt to their background and expertise

FACILITATION APPROACH:
- Use these techniques: ${strategies.techniques.join(", ")}
- For redirection, use: ${strategies.redirections.join(" Or, ")}
- Maintain your facilitator persona throughout

ADAPTIVE STRATEGIES:
- Small groups (1-3): Direct, personal engagement with specific questions
- Medium groups (4-8): Balance individual contributions with group synthesis  
- Large groups (9+): Structured sharing with clear facilitation guidance

PARTICIPANT-CENTERED APPROACH:
- Tailor language and examples to match ${participantDescription}
- Acknowledge their expertise and background
- Build on their contributions meaningfully
- Create psychological safety for participation
- Balance participation across all attendees

AUTHENTIC FACILITATION:
- Respond as ${facilitatorContext.name}, not as a generic AI
- Reference your facilitator background naturally
- Show genuine interest in participant contributions
- Guide toward session objectives while remaining responsive${languageInstruction}`;
}

/**
 * Prepare enhanced OpenAI content with aggregation and context awareness
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
  facilitatorContext?: any
) {
  let promptContent = `CURRENT SESSION STATE:\n\n`;
  
  // Add enhanced participant context
  promptContent += `PARTICIPANT CONTEXT:\n`;
  promptContent += `- Total participants: ${participantCount}\n`;
  promptContent += `- Participant profile: ${participantDescription || "General participants"}\n`;
  promptContent += `- Participation patterns: ${participantStats.summary}\n\n`;
  
  // Add facilitator context
  if (facilitatorContext) {
    promptContent += `YOUR FACILITATOR ROLE:\n`;
    promptContent += `- You are: ${facilitatorContext.name}\n`;
    promptContent += `- Your background: ${facilitatorContext.details}\n\n`;
  }
  
  // Add response aggregation context
  if (aggregateResponses && responseContext) {
    promptContent += `PARTICIPANT RESPONSES TO SYNTHESIZE:\n`;
    responseContext.participantResponses.forEach((response: any, index: number) => {
      const participantInfo = participants?.find(p => `P${p.participant_id}` === response.participant);
      const participantName = participantInfo ? participantInfo.name : response.participant;
      promptContent += `${index + 1}. ${participantName}: ${response.content}\n`;
    });
    promptContent += `\nTotal responses received: ${responseContext.totalResponses}\n\n`;
  }
  
  // Add key topics being discussed
  if (userTopics.length > 0) {
    promptContent += `KEY DISCUSSION TOPICS: ${userTopics.join(", ")}\n\n`;
  }
  
  // Add recent conversation context
  if (recentMessages.length > 0) {
    promptContent += "RECENT CONVERSATION:\n";
    recentMessages.forEach(msg => {
      if (msg.sender === 'user') {
        const participantInfo = participants?.find(p => `P${p.participant_id}` === msg.participant);
        const participantName = participantInfo ? participantInfo.name : (msg.participant || 'Participant');
        promptContent += `${participantName}: ${msg.content}\n`;
      } else if (msg.sender === 'assistant' && !msg.isReport) {
        promptContent += `${facilitatorContext?.name || 'Facilitator'}: ${msg.content}\n`;
      }
    });
    promptContent += '\n';
  }
  
  // Add specific instructions based on context
  if (generateReport) {
    promptContent += `GENERATE COMPREHENSIVE SESSION REPORT:\n`;
    promptContent += `- Analyze discussion patterns and key insights\n`;
    promptContent += `- Include participant engagement and contributions\n`;
    promptContent += `- Provide actionable recommendations\n`;
    promptContent += `- Consider the ${participantDescription} context in your analysis\n`;
  } else if (aggregateResponses) {
    promptContent += `SYNTHESIZE PARTICIPANT RESPONSES:\n`;
    promptContent += `1. Acknowledge the diverse perspectives shared\n`;
    promptContent += `2. Identify patterns, themes, and contrasts\n`;
    promptContent += `3. Build upon their contributions with follow-up questions\n`;
    promptContent += `4. Guide toward deeper exploration of key topics\n`;
    promptContent += `5. Maintain engagement appropriate for ${participantDescription}\n`;
  } else {
    promptContent += `PROVIDE THOUGHTFUL FACILITATION:\n`;
    promptContent += `1. Respond authentically as ${facilitatorContext?.name || 'the facilitator'}\n`;
    promptContent += `2. Build on participant contributions meaningfully\n`;
    promptContent += `3. Guide discussion toward session objectives\n`;
    promptContent += `4. Ask engaging questions appropriate for ${participantDescription}\n`;
    promptContent += `5. Encourage balanced participation from all attendees\n`;
  }
  
  return promptContent;
}
