
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabase = initSupabaseClient();
    
    // Parse and validate the request
    const { messages, conversationId, generateReport, wrapUpSession } = await parseRequest(req);

    // ENHANCED CONTEXT MANAGEMENT: Fetch conversation and participants data
    const conversation = await fetchConversationData(supabase, conversationId);
    const participants = await fetchParticipantsData(supabase, conversationId);

    // Process the request and generate a response
    const responseObject = await processResponse(
      supabase,
      messages,
      conversationId,
      conversation,
      participants,
      generateReport,
      wrapUpSession
    );

    console.log("Sending facilitator response:", {
      id: responseObject.id,
      isReport: responseObject.is_report,
      contentLength: responseObject.content.length,
      metrics: responseObject.metrics,
      wrapUpTriggered: wrapUpSession
    });
    
    return new Response(
      JSON.stringify(responseObject),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return createErrorResponse(error);
  }
});
