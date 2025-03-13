
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

    // Get the most recent user messages to inform the response
    const recentUserMessages = messages
      .filter(m => m.sender === 'user')
      .slice(-5)
      .map(m => m.content)
      .join("\n- ")

    console.log("Recent user messages to process:", recentUserMessages)

    // Generate facilitator response content based on user messages
    let responseContent = ""
    
    if (generateReport) {
      responseContent = "# Session Report\n\n## Key Points\n- The discussion was productive\n- Participants shared valuable insights\n- Several action items were identified\n\n## Next Steps\n1. Follow up on the discussed topics\n2. Schedule a follow-up session\n3. Share the report with all participants"
    } else if (recentUserMessages.length === 0) {
      responseContent = "Thank you for joining. I'm here to facilitate our discussion. Please share your thoughts on the topic."
    } else {
      // Respond to the user messages meaningfully
      responseContent = `Thank you for sharing your thoughts. Based on what you've said:\n\n${recentUserMessages ? `- ${recentUserMessages}` : ''}\n\nLet's dive deeper into your experience. Could you share more about specific challenges or successes you encountered?`
    }

    // Create response object
    const responseObject = {
      id: `resp-${Date.now()}`,
      content: responseContent,
      is_report: generateReport
    }

    console.log("Sending facilitator response:", responseObject)
    
    return new Response(
      JSON.stringify(responseObject),
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
