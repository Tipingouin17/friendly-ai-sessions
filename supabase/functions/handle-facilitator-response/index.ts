
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

interface VST {
  voice: string;
  style: string;
  tone: string;
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

    const { messages, conversationId, generateReport = false } = await req.json()

    console.log('Processing request for conversation:', conversationId)
    console.log('Generate report:', generateReport)

    // Get configuration including secret message
    const { data: config, error: configError } = await supabaseClient
      .from('configurations')
      .select('secret_message')
      .single()

    if (configError) {
      console.error('Error fetching configuration:', configError)
      throw new Error('Failed to fetch configuration')
    }

    // Get conversation config with ordered messages
    const { data: configData, error: conversationConfigError } = await supabaseClient
      .from('conversations_config')
      .select('*')
      .order('order', { ascending: true })

    if (conversationConfigError) {
      console.error('Error fetching conversation config:', conversationConfigError)
      throw new Error('Failed to fetch conversation configuration')
    }

    // Get conversation and session details including facilitator VST
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
            id,
            vst,
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

    // Parse facilitator's VST with proper error handling
    let vstData: VST
    try {
      vstData = conversation.sessions.facilitator.vst ? 
        JSON.parse(conversation.sessions.facilitator.vst) : 
        { voice: "professional", style: "supportive", tone: "friendly" }
    } catch (error) {
      console.error('Error parsing VST:', error)
      console.log('Raw VST value:', conversation.sessions.facilitator.vst)
      // Fallback to default values if parsing fails
      vstData = { voice: "professional", style: "supportive", tone: "friendly" }
    }

    // Format messages for the AI using the correct role structure and sequence
    const formattedMessages = messages.map((m: Message) => ({
      role: m.role || (m.sender === 'assistant' ? 'assistant' : 'user'),
      content: m.content,
      name: m.name
    }))

    // Construct system message combining VST, config, and secret message
    const systemInstructions = [
      config.secret_message,
      `You are ${conversation.sessions.facilitator.title}.`,
      `Voice: ${vstData.voice}`,
      `Style: ${vstData.style}`,
      `Tone: ${vstData.tone}`,
      conversation.sessions.prompt || "You are a helpful assistant."
    ].filter(Boolean).join('\n\n')

    // If generating a report, modify the system message
    const finalSystemMessage = generateReport ? 
      `${systemInstructions}\n\nPlease generate a comprehensive report summarizing this conversation. Include:\n- Key discussion points\n- Participant contributions\n- Important insights\n- Recommendations` :
      systemInstructions

    // Get conversation structure from config
    const conversationStructure = configData
      .filter(config => config.content)
      .map(config => ({
        role: config.role || 'system',
        content: config.content,
        parameters: config.parameters
      }))

    // Prepare the OpenAI request
    const openAIBody = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: finalSystemMessage },
        ...conversationStructure.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        ...formattedMessages
      ],
      temperature: Number(conversation.sessions.randomness) || 0.7,
      max_tokens: Number(conversation.sessions.max_tokens) || 1000,
    }

    console.log('OpenAI request body:', openAIBody)

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

    // If this was a report generation, update the conversation
    if (generateReport) {
      await supabaseClient
        .from('conversations')
        .update({ is_session_ended: true })
        .eq('id', conversationId)
    }

    return new Response(
      JSON.stringify({
        ...savedMessage,
        is_report: generateReport
      }),
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
