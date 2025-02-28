
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const { messages, conversationId, generateReport = false } = await req.json()
    
    console.log(`Processing request for conversation: ${conversationId}, generateReport: ${generateReport}`)

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

    // Mock response for testing
    const mockResponse = {
      id: Date.now().toString(),
      content: generateReport 
        ? "# Session Report\n\n## Key Points\n- The discussion was productive\n- Participants shared valuable insights\n- Several action items were identified\n\n## Next Steps\n1. Follow up on the discussed topics\n2. Schedule a follow-up session\n3. Share the report with all participants"
        : "Thank you for your messages. I've processed your input and am here to facilitate. How can I help guide the conversation further?",
      is_report: generateReport
    }

    // In a real implementation, you would call OpenAI here and save to the database
    // For now, just return a mock response to get the frontend working
    
    return new Response(
      JSON.stringify(mockResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error processing request:', error.message)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during processing' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
