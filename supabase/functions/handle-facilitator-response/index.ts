
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  content: string;
  role: string;
  name?: string;
  conversation_id: number;
  user_id?: string | null;
  facilitator_id?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { messages, conversationId } = await req.json()

    console.log('Processing request for conversation:', conversationId)

    // Get conversation and session details
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        sessions:sessions_id (
          id,
          prompt,
          gpt_version,
          max_tokens,
          randomness,
          facilitator,
          facilitator:facilitators (
            id,
            title
          )
        )
      `)
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      console.error('Error fetching conversation:', conversationError)
      throw new Error('Conversation not found')
    }

    console.log('Retrieved conversation data:', conversation)

    // Format messages for the AI
    const formattedMessages = messages.map((m: Message) => ({
      role: m.role,
      content: m.content,
      name: m.name
    }))

    // Add system prompt from the session
    const systemPrompt = {
      role: "system",
      content: conversation.sessions.prompt || "You are a helpful assistant."
    }

    // Prepare the OpenAI request
    const openAIBody = {
      model: "gpt-4o-mini", // Using the recommended model
      messages: [systemPrompt, ...formattedMessages],
      temperature: Number(conversation.sessions.randomness) || 0.7,
      max_tokens: Number(conversation.sessions.max_tokens) || 1000,
    }

    console.log('Sending request to OpenAI:', openAIBody)

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIBody),
    })

    const aiData = await openAIResponse.json()

    if (!aiData.choices?.[0]?.message) {
      console.error('Invalid AI response:', aiData)
      throw new Error('No response from AI')
    }

    console.log('Received AI response:', aiData.choices[0].message)

    // Save the AI response to the database
    const newMessage = {
      content: aiData.choices[0].message.content,
      role: "assistant",
      conversation_id: conversationId,
      facilitator_id: conversation.sessions.facilitator
    }

    const { data: savedMessage, error: saveError } = await supabaseClient
      .from('messages')
      .insert(newMessage)
      .select()
      .single()

    if (saveError) {
      console.error('Error saving message:', saveError)
      throw saveError
    }

    return new Response(
      JSON.stringify(savedMessage),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
