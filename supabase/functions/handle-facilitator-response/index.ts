
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Import shared modules
import { FACILITATION_STRATEGIES } from "../_shared/facilitation-strategies.ts";
import { REPORT_TEMPLATES } from "../_shared/report-templates.ts";
import { 
  fetchConversationData, 
  fetchParticipantsData, 
  determineSessionProgress,
  pruneMessagesToFitContext,
  MAX_TOKEN_ESTIMATE
} from "../_shared/context-management.ts";
import { 
  analyzeParticipation,
  extractUserTopics
} from "../_shared/message-analysis.ts";
import { 
  generateEnhancedTemplateResponse 
} from "../_shared/response-generation.ts";
import { 
  generateOpenAIResponse,
  prepareOpenAIPrompt,
  prepareOpenAIContent
} from "../_shared/openai-integration.ts";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Initialize Supabase client with environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// OpenAI API key
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { messages, conversationId, generateReport = false, facilitationMetrics = {} } = await req.json()
    
    console.log(`Processing request for conversation: ${conversationId}, generateReport: ${generateReport}`)
    console.log(`Received ${messages.length} messages to process`)

    // Input validation
    if (!messages || !Array.isArray(messages) || !conversationId) {
      console.error("Invalid input: Missing messages array or conversationId")
      return new Response(
        JSON.stringify({ error: 'Invalid input: Messages array and conversationId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // ENHANCED CONTEXT MANAGEMENT: Fetch conversation and participants data
    const conversation = await fetchConversationData(supabase, conversationId);
    const participants = await fetchParticipantsData(supabase, conversationId);

    // Track participation metrics with enhanced participant awareness
    const participantStats = analyzeParticipation(messages, participants || []);
    
    // Determine session progress (time-based estimate)
    const sessionProgress = determineSessionProgress(conversation, messages);

    // Extract participant description and count information
    const participantCount = conversation?.participants || participants?.length || 0;
    const participantDescription = conversation?.participant_description || "";
    const sessionLanguage = conversation?.language || "en";
    
    console.log(`Participant count: ${participantCount}, Description: ${participantDescription}, Language: ${sessionLanguage}`);

    // Response generation setup
    let responseContent = "";
    let responseMetrics = {
      generationMethod: "template",
      generationTime: 0,
      responseQuality: "medium",
      topicRelevance: "medium",
      participationBalance: participantStats.participationBalance
    };
    
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
          
          responseMetrics = {
            generationMethod: "ai",
            generationTime: Math.round(endTime - startTime),
            responseQuality: "high",
            topicRelevance: "high",
            participationBalance: participantStats.participationBalance
          };
          
          // Save metrics to database for analysis
          try {
            await supabase.from('session_events').insert({
              conversation_id: conversationId,
              event_type: generateReport ? 'report_generation' : 'facilitator_response',
              data: {
                metrics: responseMetrics,
                contentLength: responseContent.length,
                topics: userTopics,
                participationStats: participantStats,
                participantCount,
                participantDescription,
                language: sessionLanguage
              }
            });
          } catch (error) {
            console.error("Error saving metrics:", error instanceof Error ? error.message : "Unknown error");
          }
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
    const responseObject = {
      id: `resp-${Date.now()}`,
      content: responseContent,
      is_report: generateReport,
      metrics: responseMetrics,
      avatar: facilitatorAvatar
    };

    console.log("Sending facilitator response:", {
      id: responseObject.id,
      isReport: responseObject.is_report,
      contentLength: responseObject.content.length,
      metrics: responseObject.metrics
    });
    
    return new Response(
      JSON.stringify(responseObject),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error processing request:', error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'An error occurred during processing' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
