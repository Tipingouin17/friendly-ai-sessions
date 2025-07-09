
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
    
    // Parse and validate the request with enhanced debugging
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

    if (!openaiApiKey) {
      console.error(`❌ [${requestId}] OpenAI API key not found in environment`);
      return createErrorResponse(new Error('OpenAI API key not configured'));
    }

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
      participantDescription: conversation?.participant_description,
      conversationStructure: {
        hasSession: !!conversation?.sessions,
        sessionKeys: conversation?.sessions ? Object.keys(conversation.sessions) : [],
        hasFacilitatorDetails: !!conversation?.sessions?.facilitator_details,
        facilitatorDetailsKeys: conversation?.sessions?.facilitator_details ? Object.keys(conversation.sessions.facilitator_details) : []
      }
    });

    // Enhanced debugging for session 1558 and similar cases
    if (sessionStart && conversation) {
      console.log(`🎯 [${requestId}] Session start request - Enhanced context analysis:`, {
        conversationId,
        sessionTitle: conversation?.sessions?.title,
        facilitatorTitle: conversation?.sessions?.facilitator_details?.title,
        facilitatorDetails: conversation?.sessions?.facilitator_details?.details?.substring(0, 100) + '...',
        facilitatorExpertise: conversation?.sessions?.facilitator_details?.expertise_level,
        sessionObjective: conversation?.sessions?.objective?.substring(0, 100) + '...',
        participantDescription: conversation?.participant_description,
        hasRichContext: !!(conversation?.sessions?.facilitator_details?.title && conversation?.sessions?.objective)
      });

      // Update welcome message status to 'generating' when starting AI generation
      try {
        await supabase
          .from('conversations')
          .update({ welcome_message_status: 'generating' })
          .eq('id', conversationId);
        
        console.log(`🔄 [${requestId}] Updated welcome message status to 'generating'`);
      } catch (statusError) {
        console.error(`❌ [${requestId}] Error updating welcome message status:`, statusError);
      }
    }

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
