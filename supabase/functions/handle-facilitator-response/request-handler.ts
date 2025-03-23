
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for browser requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Parse and validate incoming request
 */
export async function parseRequest(req: Request) {
  // Parse request body
  const { messages, conversationId, generateReport = false, facilitationMetrics = {} } = await req.json();
  
  console.log(`Processing request for conversation: ${conversationId}, generateReport: ${generateReport}`);
  console.log(`Received ${messages.length} messages to process`);

  // Input validation
  if (!messages || !Array.isArray(messages) || !conversationId) {
    console.error("Invalid input: Missing messages array or conversationId");
    throw new Error('Invalid input: Messages array and conversationId are required');
  }

  return { messages, conversationId, generateReport, facilitationMetrics };
}

/**
 * Initialize Supabase client
 */
export function initSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'An error occurred during processing';
  console.error('Error processing request:', errorMessage);
  return new Response(
    JSON.stringify({ error: errorMessage }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
