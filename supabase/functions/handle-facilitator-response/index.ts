
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
  
  console.log(`🚀 [${requestId}] Edge function started:`, {
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

    // Check OpenAI API key availability
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log(`🔑 [${requestId}] OpenAI API key status:`, {
      hasKey: !!openaiApiKey,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'undefined'
    });

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

    // Process the request and generate a response
    console.log(`🤖 [${requestId}] Starting response processing...`);
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

    console.log(`🎉 [${requestId}] Response processing complete:`, {
      processingDuration: `${processingDuration.toFixed(2)}ms`,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      responseData: {
        id: responseObject.id,
        isReport: responseObject.is_report,
        contentLength: responseObject.content.length,
        generationMethod: responseObject.metrics?.generationMethod,
        hasAvatar: !!responseObject.avatar,
        hasFacilitatorContext: !!responseObject.facilitator_context,
        hasSessionContext: !!responseObject.session_context
      }
    });

    console.log(`📤 [${requestId}] Sending facilitator response:`, {
      id: responseObject.id,
      isReport: responseObject.is_report,
      contentLength: responseObject.content.length,
      metrics: responseObject.metrics,
      wrapUpTriggered: wrapUpSession,
      sessionStartTriggered: sessionStart,
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
    console.error(`💥 [${requestId}] Edge function error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return createErrorResponse(error);
  }
});
