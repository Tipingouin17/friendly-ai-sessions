
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
import { FACILITATION_STRATEGIES } from "../_shared/facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "../_shared/report-templates.ts";
import { 
  pruneMessagesToFitContext,
  MAX_TOKEN_ESTIMATE
} from "../_shared/context-management.ts";
import { createResponseMetrics, trackSessionMetrics } from "./metrics-handler.ts";

/**
 * Process the request and generate a facilitator response
 */
export async function processResponse(
  supabase: any,
  messages: any[],
  conversationId: number,
  conversation: any,
  participants: any[],
  generateReport: boolean
) {
  // Track participation metrics with enhanced participant awareness
  const participantStats = analyzeParticipation(messages, participants || []);
  
  // Extract participant description and count information
  const participantCount = conversation?.participants || participants?.length || 0;
  const participantDescription = conversation?.participant_description || "";
  const sessionLanguage = conversation?.language || "en";
  
  console.log(`Participant count: ${participantCount}, Description: ${participantDescription}, Language: ${sessionLanguage}`);

  // Get OpenAI API key
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';
  
  // Response generation setup
  let responseContent = "";
  let responseMetrics = createResponseMetrics('template', 0, participantStats.participationBalance);
  
  // Determine session progress
  let sessionProgress = "early";
  if (conversation?.sessions?.duration_minutes) {
    const firstMessageTime = messages.length > 0 ? new Date(messages[0].timestamp) : new Date();
    const elapsed = (new Date().getTime() - firstMessageTime.getTime()) / (1000 * 60);
    const progressPercent = Math.min(100, Math.round((elapsed / conversation.sessions.duration_minutes) * 100));
    
    if (progressPercent > 80) sessionProgress = "concluding";
    else if (progressPercent > 40) sessionProgress = "middle";
  }
  
  // Use OpenAI if available
  if (openaiApiKey && conversation?.sessions) {
    try {
      console.log("Using improved OpenAI integration for response generation");
      const startTime = performance.now();
      
      // Construct session context
      const sessionType = conversation.sessions.session_type || "workshop";
      
      // Get relevant facilitation strategies
      const strategies = FACILITATION_STRATEGIES[sessionType as keyof typeof FACILITATION_STRATEGIES] || FACILITATION_STRATEGIES.workshop;
      
      // Prune messages to fit context window
      const prunedMessages = pruneMessagesToFitContext(messages, MAX_TOKEN_ESTIMATE);
      
      // Extract user questions and topics
      const userTopics = extractUserTopics(prunedMessages);
      
      // Prepare OpenAI prompt with language awareness
      let basePrompt = prepareOpenAIPrompt(
        conversation, 
        sessionProgress, 
        participantCount, 
        participantDescription, 
        strategies
      );
      
      // Add language instruction to the prompt
      if (sessionLanguage && sessionLanguage !== "en") {
        basePrompt += `\n\nIMPORTANT: Please respond in ${sessionLanguage} language only. The entire response should be in ${sessionLanguage} language.`;
      }
      
      // Prepare content for OpenAI based on context
      const reportTemplate = REPORT_TEMPLATES[sessionType as keyof typeof REPORT_TEMPLATES] || REPORT_TEMPLATES.default;
      const promptContent = prepareOpenAIContent(
        prunedMessages.slice(-15), 
        participantCount, 
        participantDescription,
        userTopics,
        participantStats,
        participants,
        generateReport,
        reportTemplate
      );
      
      // Call OpenAI
      const openAIResult = await generateOpenAIResponse(
        openaiApiKey,
        basePrompt,
        promptContent,
        generateReport
      );
      
      const endTime = performance.now();
      
      if (openAIResult.success) {
        responseContent = openAIResult.content;
        console.log("OpenAI generated response (truncated):", responseContent.substring(0, 100) + "...");
        
        responseMetrics = createResponseMetrics('ai', Math.round(endTime - startTime), participantStats.participationBalance);
        
        // Save metrics to database for analysis
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
          generateReport ? 'report_generation' : 'facilitator_response'
        );
      } else {
        console.error("OpenAI API error:", openAIResult.error);
        // Fall back to improved template response
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
      console.error("Error in OpenAI processing:", error instanceof Error ? error.message : "Unknown error");
      
      // Fall back to improved template response
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
    console.log("Using template-based response generation (OpenAI unavailable)");
    
    // Use template-based response generation with improvements
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

  // Set a standard avatar for the facilitator
  const facilitatorAvatar = '/api/avatar?name=Facilitator&variant=beam&palette=2';

  // Create response object with metrics
  return {
    id: `resp-${Date.now()}`,
    content: responseContent,
    is_report: generateReport,
    metrics: responseMetrics,
    avatar: facilitatorAvatar
  };
}
