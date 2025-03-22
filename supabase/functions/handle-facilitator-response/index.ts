
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

    // Get conversation data to inform response
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        sessions:sessions_id (
          title,
          objective,
          prompt
        )
      `)
      .eq('id', conversationId)
      .single()

    if (conversationError) {
      console.error("Error fetching conversation:", conversationError.message)
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
    
    if (openaiApiKey && conversation?.sessions?.prompt) {
      // Use OpenAI API if key is available and session has a prompt
      try {
        console.log("Using OpenAI API for response generation")
        
        const prompt = conversation.sessions.prompt || 
          "You are a helpful facilitator guiding a discussion session. Respond to participant messages with thoughtful questions that help them explore the topic deeper."
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: prompt },
              { role: 'user', content: `Here are recent messages from participants: \n${recentUserMessages}\n\nProvide a thoughtful facilitator response that helps guide the discussion further.` }
            ],
          }),
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0]?.message?.content) {
          responseContent = data.choices[0].message.content;
          console.log("OpenAI generated response:", responseContent)
        } else {
          console.error("OpenAI API returned unexpected format:", data)
          // Fall back to template response
          responseContent = generateTemplateResponse(recentUserMessages, generateReport, conversation);
        }
      } catch (error) {
        console.error("Error using OpenAI API:", error.message);
        // Fall back to template response
        responseContent = generateTemplateResponse(recentUserMessages, generateReport, conversation);
      }
    } else {
      // Use template-based response generation
      responseContent = generateTemplateResponse(recentUserMessages, generateReport, conversation);
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

/**
 * Generate a template-based response when OpenAI is not available
 */
function generateTemplateResponse(recentUserMessages: string, generateReport: boolean, conversation: any) {
  if (generateReport) {
    return `# Session Report\n\n## Key Points\n- The discussion was productive\n- Participants shared valuable insights\n- Several action items were identified\n\n## Next Steps\n1. Follow up on the discussed topics\n2. Schedule a follow-up session\n3. Share the report with all participants`
  } else if (!recentUserMessages) {
    return "Thank you for joining. I'm here to facilitate our discussion. Please share your thoughts on the topic."
  } else {
    // Respond to the user messages meaningfully
    return `Thank you for sharing your thoughts. Based on what you've said:\n\n${recentUserMessages ? `- ${recentUserMessages}` : ''}\n\nLet's dive deeper into your experience. Could you share more about specific challenges or successes you encountered?`
  }
}
