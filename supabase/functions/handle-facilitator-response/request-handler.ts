
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
  const body = await req.json()
  
  const { 
    messages = [], 
    conversationId, 
    generateReport = false,
    wrapUpSession = false 
  } = body
  
  if (!conversationId) {
    throw new Error('Missing conversationId')
  }
  
  console.log(`Processing request: conversationId=${conversationId}, generateReport=${generateReport}, wrapUpSession=${wrapUpSession}, messagesCount=${messages.length}`)
  
  return { 
    messages, 
    conversationId: Number(conversationId), 
    generateReport: Boolean(generateReport),
    wrapUpSession: Boolean(wrapUpSession)
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
