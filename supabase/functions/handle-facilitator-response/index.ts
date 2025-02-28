
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.4.0'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'
import { cuid } from 'https://esm.sh/@paralleldrive/cuid2@2.0.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const configuration = new Configuration({ apiKey: openaiApiKey })
const openai = new OpenAIApi(configuration)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { messages, conversationId, generateReport = false } = await req.json()
    
    console.log(`Processing request for conversation: ${conversationId}\n`);

    // Check for required parameters
    if (!messages || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Messages and conversationId are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // First get the conversation to verify it exists and get related session data
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        *,
        sessions:sessions_id (
          id, 
          title, 
          objective,
          prompt,
          output_format,
          gpt_version,
          max_tokens,
          randomness,
          facilitator:facilitators (id, title, details)
        )
      `)
      .eq('id', conversationId)
      .single()

    // Handle errors fetching conversation
    if (conversationError || !conversation) {
      console.error('Error fetching conversation:', conversationError?.message || 'Conversation not found')
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Transform messages for OpenAI format
    const formattedMessages = messages.map(msg => {
      if (msg.role) {
        // Already in OpenAI format (from the database)
        return {
          role: msg.role,
          content: msg.content,
          name: msg.name
        }
      } else {
        // Format UI messages to OpenAI format
        return {
          role: msg.sender === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
          name: msg.participant || undefined
        }
      }
    })

    // Add system prompt if it's a report generation or use session prompt
    let systemPrompt = ''
    
    if (generateReport) {
      systemPrompt = `You are a helpful assistant that generates summarized reports of group conversations. 
      Analyze the conversation and provide a structured report that includes:
      1. Key discussion points
      2. Main insights and takeaways
      3. Action items or recommendations (if any)
      Format the report in markdown with clear headings and bullet points.`
    } else if (conversation.sessions?.prompt) {
      systemPrompt = conversation.sessions.prompt
    } else {
      // Default system prompt if none specified
      systemPrompt = `You are "${conversation.sessions?.facilitator?.title || 'a facilitator'}", ${conversation.sessions?.facilitator?.details || 'an AI assistant helping facilitate a conversation'}. 
      Your objective is: ${conversation.sessions?.objective || 'to facilitate a productive conversation'}.
      Be concise, helpful, and guide the conversation toward productive outcomes.`
    }

    // Add system message to the beginning
    const messagesForAI = [
      { role: 'system', content: systemPrompt },
      ...formattedMessages
    ]

    // Get model settings
    const model = conversation.sessions?.gpt_version || 'gpt-3.5-turbo'
    const maxTokens = conversation.sessions?.max_tokens ? parseInt(conversation.sessions.max_tokens) : 1000
    const temperature = conversation.sessions?.randomness || 0.7

    // Make request to OpenAI
    const response = await openai.createChatCompletion({
      model,
      messages: messagesForAI,
      max_tokens: maxTokens,
      temperature
    })

    // Extract the response content
    const content = response.data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
    const messageId = cuid()

    // Save to database
    const { error: saveError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        role: 'assistant',
        content,
        conversation_id: conversationId,
        facilitator_id: conversation.sessions?.facilitator?.id || null,
        is_report: generateReport
      })

    if (saveError) {
      console.error('Error saving message to database:', saveError)
    }

    return new Response(
      JSON.stringify({
        id: messageId,
        content,
        is_report: generateReport
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
