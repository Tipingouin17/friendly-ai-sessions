
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function initSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  
  console.log("🔧 Initializing Supabase client:", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 20) + '...'
  });
  
  return createClient(supabaseUrl, supabaseAnonKey)
}

export async function parseRequest(req: Request) {
  const parseStart = performance.now();
  
  try {
    console.log("📥 Parsing incoming request:", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });
    
    const body = await req.json();
    const parseDuration = performance.now() - parseStart;
    
    console.log("📋 Request body parsed:", {
      duration: `${parseDuration.toFixed(2)}ms`,
      bodyKeys: Object.keys(body),
      messageCount: Array.isArray(body.messages) ? body.messages.length : 'not_array',
      conversationId: body.conversationId,
      flags: {
        generateReport: body.generateReport,
        wrapUpSession: body.wrapUpSession,
        sessionStart: body.sessionStart
      }
    });
    
    console.log("📥 Full request body:", JSON.stringify(body, null, 2));
    
    const { 
      messages = [], 
      conversationId, 
      generateReport = false, 
      wrapUpSession = false,
      sessionStart = false 
    } = body;
    
    // Validate required fields
    if (!conversationId) {
      console.error("❌ Validation failed: conversationId is required");
      throw new Error("conversationId is required");
    }
    
    if (!Array.isArray(messages)) {
      console.error("❌ Validation failed: messages must be an array", typeof messages);
      throw new Error("messages must be an array");
    }
    
    const validatedData = {
      messages,
      conversationId: Number(conversationId),
      generateReport: Boolean(generateReport),
      wrapUpSession: Boolean(wrapUpSession),
      sessionStart: Boolean(sessionStart)
    };
    
    console.log("✅ Request validation passed:", {
      ...validatedData,
      messageCount: messages.length,
      duration: `${parseDuration.toFixed(2)}ms`
    });
    
    return validatedData;
  } catch (error) {
    const parseDuration = performance.now() - parseStart;
    console.error("❌ Request parsing failed:", {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${parseDuration.toFixed(2)}ms`,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Invalid request format: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function createErrorResponse(error: any) {
  console.error('💥 Creating error response:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
  
  return new Response(
    JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }),
    { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}
