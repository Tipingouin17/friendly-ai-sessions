
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function initSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function parseRequest(req: Request) {
  try {
    const body = await req.json();
    console.log("📥 Received request body:", JSON.stringify(body, null, 2));
    
    const { 
      messages = [], 
      conversationId, 
      generateReport = false, 
      wrapUpSession = false,
      sessionStart = false 
    } = body;
    
    // Validate required fields
    if (!conversationId) {
      throw new Error("conversationId is required");
    }
    
    if (!Array.isArray(messages)) {
      throw new Error("messages must be an array");
    }
    
    console.log("✅ Request validation passed:", {
      messageCount: messages.length,
      conversationId,
      generateReport,
      wrapUpSession,
      sessionStart
    });
    
    return {
      messages,
      conversationId: Number(conversationId),
      generateReport: Boolean(generateReport),
      wrapUpSession: Boolean(wrapUpSession),
      sessionStart: Boolean(sessionStart)
    };
  } catch (error) {
    console.error("❌ Request parsing failed:", error);
    throw new Error(`Invalid request format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createErrorResponse(error: any) {
  console.error('Edge function error:', error)
  
  return new Response(
    JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}
