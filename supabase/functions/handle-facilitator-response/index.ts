import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Message {
  content: string;
  role?: string;
  name?: string;
  sender?: string;
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
    console.log('Received messages:', messages)

    // Get conversation config
    const { data: configData, error: configError } = await supabaseClient
      .from('conversations_config')
      .select('*')
      .order('order', { ascending: true })

    if (configError) {
      console.error('Error fetching conversation config:', configError)
      throw new Error('Failed to fetch conversation configuration')
    }

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
          facilitator:facilitators (
            id
          )
        )
      `)
      .eq('id', conversationId)
      .single()

    if (conversationError || !conversation) {
      console.error('Error fetching conversation:', conversationError)
      throw new Error('Conversation not found')
    }

    // Format messages for the AI using the correct role structure
    const formattedMessages = messages.map((m: Message) => {
      // If the message already has a role defined, use it
      if (m.role) {
        return {
          role: m.role,
          content: m.content,
          name: m.name
        }
      }
      
      // Otherwise, determine the role based on sender
      return {
        role: m.sender === 'assistant' ? 'assistant' : 'user',
        content: m.content,
        name: m.name
      }
    })

    // Get system prompt from conversation config or session
    const systemMessage = configData?.find(config => config.role === 'system')
    const systemPrompt = {
      role: "system",
      content: systemMessage?.content || conversation.sessions.prompt || "You are a helpful assistant."
    }

    // Prepare the OpenAI request
    const openAIBody = {
      model: "gpt-4o-mini",
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

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData}`)
    }

    const aiData = await openAIResponse.json()

    if (!aiData.choices?.[0]?.message) {
      console.error('Invalid AI response:', aiData)
      throw new Error('No response from AI')
    }

    // Save the AI response to the database
    const newMessage = {
      content: aiData.choices[0].message.content,
      role: "assistant",
      conversation_id: conversationId,
      facilitator_id: conversation.sessions.facilitator?.id || null
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
