
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
  user_id?: string;
  facilitator_id?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { messages, conversationId } = await req.json()

    // Get conversation and session details
    const { data: conversation } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        sessions:sessions_id (
          prompt,
          gpt_version,
          max_tokens,
          randomness,
          facilitator:facilitators (*)
        )
      `)
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    // Format messages for the AI
    const formattedMessages = messages.map((m: Message) => ({
      role: m.role,
      content: m.content,
      name: m.name
    }))

    // Add system prompt from the session
    const systemPrompt = {
      role: "system",
      content: conversation.sessions.prompt
    }

    // Prepare the OpenAI request
    const openAIBody = {
      model: conversation.sessions.gpt_version || "gpt-3.5-turbo",
      messages: [systemPrompt, ...formattedMessages],
      temperature: Number(conversation.sessions.randomness) || 0.7,
      max_tokens: Number(conversation.sessions.max_tokens) || 1000,
    }

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
      throw new Error('No response from AI')
    }

    // Save the AI response to the database
    const newMessage = {
      content: aiData.choices[0].message.content,
      role: "assistant",
      conversation_id: conversationId,
      facilitator_id: conversation.sessions.facilitator.id
    }

    const { data: savedMessage, error } = await supabaseClient
      .from('messages')
      .insert(newMessage)
      .select()
      .single()

    if (error) throw error

    return new Response(
      JSON.stringify(savedMessage),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
