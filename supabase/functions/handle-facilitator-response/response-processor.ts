
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
import { 
  extractFacilitatorContext, 
  extractSessionContext, 
  createContextualSystemPrompt,
  FacilitatorContext,
  SessionContext
} from "./enhanced-context-extractor.ts";

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
  console.log('🚀 Starting enhanced response processing for conversation:', conversationId, {
    sessionStart,
    wrapUpSession,
    aggregateResponses,
    generateReport,
    conversationData: !!conversation,
    participantCount: participants?.length || 0
  });

  // Extract enhanced context using new utilities
  const facilitatorContext = extractFacilitatorContext(conversation);
  const sessionContextData = extractSessionContext(conversation, participants);

  console.log('📋 Enhanced context extracted:', {
    facilitatorName: facilitatorContext.name,
    facilitatorDetails: facilitatorContext.details,
    sessionTitle: sessionContextData.title,
    sessionObjective: sessionContextData.objective,
    participantDescription: sessionContextData.participantDescription,
    participantCount: sessionContextData.participantCount
  });

  // Track participation metrics with enhanced participant awareness
  const participantStats = analyzeParticipation(messages, participants || []);
  
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
      console.log("🤖 Using enhanced OpenAI integration with COMPLETE session and facilitator context");
      const startTime = performance.now();
      
      // Get relevant facilitation strategies
      const strategies = FACILITATION_STRATEGIES[sessionContextData.sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
      
      // Prune messages to fit context window
      const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE);
      
      // Extract user questions and topics
      const userTopics = extractUserTopics(prunedMessages);
      
      // Create enhanced system prompt with complete context
      let systemPrompt = createContextualSystemPrompt(
        facilitatorContext,
        sessionContextData,
        sessionProgress,
        sessionStart
      );
      
      // Add response aggregation instruction
      if (aggregateResponses && responseContext) {
        systemPrompt += `\n\nIMPORTANT RESPONSE AGGREGATION: You are ${facilitatorContext.name} synthesizing responses from ${responseContext.totalResponses} ${sessionContextData.participantDescription}. Please:
1. Acknowledge the diverse perspectives shared by the ${sessionContextData.participantDescription}
2. Identify common themes and interesting contrasts in their responses
3. Build upon their contributions with follow-up questions appropriate for ${sessionContextData.participantDescription}
4. Encourage deeper exploration of topics relevant to: ${sessionContextData.objective}
5. Guide the discussion toward the session objectives using your expertise: ${facilitatorContext.details}
6. Maintain your facilitator persona as ${facilitatorContext.name} throughout`;
      }
      
      // Add wrap up instruction if requested
      if (wrapUpSession) {
        systemPrompt += `\n\nSESSION WRAP-UP: As ${facilitatorContext.name}, please wrap up this session for the ${sessionContextData.participantCount} ${sessionContextData.participantDescription}:
1. Acknowledge that the session is coming to a close
2. Summarize key insights relevant to the objective: ${sessionContextData.objective}
3. Highlight the most valuable contributions made by the ${sessionContextData.participantDescription}
4. Ask for final thoughts specifically related to: ${sessionContextData.objective}
5. Provide a meaningful conclusion that ties back to the original goals and your expertise`;
      }
      
      // Prepare enhanced content for OpenAI with complete context
      const promptContent = prepareEnhancedOpenAIContent(
        prunedMessages.slice(-15), 
        sessionContextData.participantCount, 
        sessionContextData.participantDescription,
        userTopics,
        participantStats,
        participants,
        generateReport,
        aggregateResponses,
        responseContext,
        facilitatorContext,
        sessionContextData.objective,
        sessionContextData.sessionType
      );
      
      // Call OpenAI with enhanced context
      const openAIResult = await generateOpenAIResponse(
        openaiApiKey,
        systemPrompt,
        promptContent,
        generateReport
      );
      
      const endTime = performance.now();
      
      if (openAIResult.success) {
        responseContent = openAIResult.content;
        console.log("✅ Enhanced OpenAI response generated with complete facilitator context:", responseContent.substring(0, 100) + "...");
        
        responseMetrics = createResponseMetrics('ai', Math.round(endTime - startTime), participantStats.participationBalance);
        
        // Save enhanced metrics to database with complete context
        await trackSessionMetrics(
          supabase,
          conversationId,
          responseMetrics, 
          responseContent,
          userTopics,
          participantStats,
          sessionContextData.participantCount,
          sessionContextData.participantDescription,
          sessionContextData.language,
          sessionStart ? 'session_start' : 
          (aggregateResponses ? 'response_aggregation' : 
          (wrapUpSession ? 'session_wrap_up' : 
          (generateReport ? 'report_generation' : 'facilitator_response'))),
          facilitatorContext,
          sessionContextData.objective
        );
      } else {
        console.error("❌ Enhanced OpenAI API error:", openAIResult.error);
        // Fall back to enhanced template response with complete context
        responseContent = generateEnhancedTemplateResponse(
          prunedMessages, 
          generateReport, 
          conversation, 
          sessionProgress, 
          participantStats, 
          userTopics,
          sessionContextData.participantCount,
          sessionContextData.participantDescription,
          facilitatorContext,
          sessionContextData.objective
        );
      }
    } catch (error) {
      console.error("💥 Error in enhanced OpenAI processing:", error instanceof Error ? error.message : "Unknown error");
      
      // Fall back to enhanced template response with complete context
      responseContent = generateEnhancedTemplateResponse(
        messages, 
        generateReport, 
        conversation, 
        sessionProgress, 
        participantStats, 
        extractUserTopics(messages),
        sessionContextData.participantCount,
        sessionContextData.participantDescription,
        facilitatorContext,
        sessionContextData.objective
      );
    }
  } else {
    console.log("📝 Using enhanced template-based response generation with complete context");
    
    responseContent = generateEnhancedTemplateResponse(
      messages, 
      generateReport, 
      conversation, 
      sessionProgress, 
      participantStats, 
      extractUserTopics(messages),
      sessionContextData.participantCount,
      sessionContextData.participantDescription,
      facilitatorContext,
      sessionContextData.objective
    );
  }

  // Create response object with enhanced metrics and complete context
  const result = {
    id: `resp-${Date.now()}`,
    content: responseContent,
    is_report: generateReport,
    metrics: responseMetrics,
    avatar: facilitatorAvatar || '/api/avatar?name=Facilitator&variant=beam&palette=2',
    facilitator_context: facilitatorContext,
    session_context: sessionContextData
  };

  console.log('✅ Response processing complete:', {
    contentLength: responseContent.length,
    facilitatorName: facilitatorContext.name,
    sessionObjective: sessionContextData.objective,
    participantDescription: sessionContextData.participantDescription
  });

  return result;
}

/**
 * Prepare enhanced OpenAI content with complete context awareness
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
  facilitatorContext?: FacilitatorContext,
  sessionObjective?: string,
  sessionType?: string
) {
  let promptContent = `CURRENT SESSION STATE WITH COMPLETE CONTEXT:\n\n`;
  
  // Add enhanced participant context
  promptContent += `PARTICIPANT CONTEXT (CRITICAL):\n`;
  promptContent += `- Total participants: ${participantCount}\n`;
  promptContent += `- Participant profile: ${participantDescription}\n`;
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
