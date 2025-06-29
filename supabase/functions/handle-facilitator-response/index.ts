
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import shared modules
import { 
  fetchConversationData, 
  fetchParticipantsData 
} from "../_shared/context-management.ts";

// Import local modules
import { parseRequest, initSupabaseClient, corsHeaders, createErrorResponse } from "./request-handler.ts";
import { processResponse } from "./response-processor.ts";

serve(async (req) => {
  const requestStart = performance.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🚀 [${requestId}] Enhanced edge function started:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    userAgent: req.headers.get('user-agent')
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight handled`);
    return new Response(null, { headers: corsHeaders })
  }

  // Handle health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    console.log(`🏥 [${requestId}] Health check requested`);
    
    try {
      const { checkAIPipelineHealth } = await import("./ai-pipeline-handler.ts");
      const healthStatus = await checkAIPipelineHealth();
      
      console.log(`🏥 [${requestId}] Health check result:`, healthStatus);
      
      return new Response(
        JSON.stringify({
          healthy: healthStatus.healthy,
          timestamp: new Date().toISOString(),
          checks: healthStatus.checks,
          errors: healthStatus.errors
        }),
        { 
          status: healthStatus.healthy ? 200 : 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } catch (error) {
      console.error(`💥 [${requestId}] Health check error:`, error);
      return new Response(
        JSON.stringify({
          healthy: false,
          error: 'Health check failed',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }

  try {
    // Initialize Supabase client
    const clientStart = performance.now();
    const supabase = initSupabaseClient();
    const clientDuration = performance.now() - clientStart;
    console.log(`🔧 [${requestId}] Supabase client initialized in ${clientDuration.toFixed(2)}ms`);
    
    // Parse and validate the request
    console.log(`📥 [${requestId}] Parsing request...`);
    const { messages, conversationId, generateReport, wrapUpSession, sessionStart } = await parseRequest(req);
    console.log(`✅ [${requestId}] Request parsed successfully:`, {
      conversationId,
      messageCount: messages.length,
      flags: { generateReport, wrapUpSession, sessionStart }
    });

    // Validate OpenAI configuration
    const { validateOpenAIConfig } = await import("./ai-pipeline-handler.ts");
    const configValidation = validateOpenAIConfig();
    console.log(`🔑 [${requestId}] OpenAI configuration validation:`, configValidation);

    // ENHANCED CONTEXT MANAGEMENT: Fetch conversation and participants data
    console.log(`📋 [${requestId}] Fetching conversation data for ID: ${conversationId}...`);
    const contextStart = performance.now();
    
    const conversation = await fetchConversationData(supabase, conversationId);
    const participants = await fetchParticipantsData(supabase, conversationId);
    
    const contextDuration = performance.now() - contextStart;
    console.log(`✅ [${requestId}] Context fetched in ${contextDuration.toFixed(2)}ms:`, {
      hasConversation: !!conversation,
      participantCount: participants?.length || 0,
      facilitatorName: conversation?.sessions?.facilitator_details?.title,
      sessionObjective: conversation?.sessions?.objective?.substring(0, 50) + '...',
      participantDescription: conversation?.participant_description
    });

    // Process the request with enhanced pipeline
    console.log(`🤖 [${requestId}] Starting enhanced response processing...`);
    const processingStart = performance.now();
    
    const responseObject = await processResponse(
      supabase,
      messages,
      conversationId,
      conversation,
      participants,
      generateReport,
      wrapUpSession,
      sessionStart
    );

    const processingDuration = performance.now() - processingStart;
    const totalDuration = performance.now() - requestStart;

    console.log(`🎉 [${requestId}] Enhanced response processing complete:`, {
      processingDuration: `${processingDuration.toFixed(2)}ms`,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      responseData: {
        id: responseObject.id,
        isReport: responseObject.is_report,
        contentLength: responseObject.content.length,
        generationMethod: responseObject.metrics?.ai_generation_success ? 'ai' : 'enhanced_fallback',
        hasAvatar: !!responseObject.avatar,
        hasFacilitatorContext: !!responseObject.facilitator_context,
        hasSessionContext: !!responseObject.session_context,
        qualityValidationPassed: responseObject.metrics?.quality_validation_passed
      }
    });

    console.log(`📤 [${requestId}] Sending enhanced facilitator response:`, {
      id: responseObject.id,
      isReport: responseObject.is_report,
      contentLength: responseObject.content.length,
      metrics: responseObject.metrics,
      facilitatorName: responseObject.facilitator_context?.name,
      sessionObjective: responseObject.session_context?.objective?.substring(0, 50) + '...'
    });
    
    return new Response(
      JSON.stringify(responseObject),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    const totalDuration = performance.now() - requestStart;
    console.error(`💥 [${requestId}] Enhanced edge function error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return createErrorResponse(error);
  }
});
