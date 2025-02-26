
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

    // Get conversation and session details including facilitator VST
    const { data: conversation, error: conversationError } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        sessions!conversations_sessions_id_fkey (
          id,
          prompt,
          gpt_version,
          max_tokens,
          randomness,
          facilitator,
          facilitator_details:facilitators (
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
    let vstData = {
      voice: "professional",
      style: "supportive",
      tone: "friendly"
    }
    try {
      if (conversation.sessions.facilitator_details.vst) {
        const vstLines = conversation.sessions.facilitator_details.vst.split('\n')
        vstData = {
          voice: vstLines.find(line => line.startsWith('Voice:'))?.split(':')[1]?.trim() || vstData.voice,
          style: vstLines.find(line => line.startsWith('Style:'))?.split(':')[1]?.trim() || vstData.style,
          tone: vstLines.find(line => line.startsWith('Tone:'))?.split(':')[1]?.trim() || vstData.tone
        }
      }
    } catch (error) {
      console.error('Error parsing VST:', error)
      console.log('Raw VST value:', conversation.sessions.facilitator_details.vst)
    }

    // Format messages for OpenAI
    const formattedMessages = messages.map((m: Message) => ({
      role: m.role || (m.sender === 'assistant' ? 'assistant' : 'user'),
      content: m.content,
      name: m.name
    }))

    // Construct system message
    const systemInstructions = [
      config.secret_message,
      `You are ${conversation.sessions.facilitator_details.title}.`,
      `Voice: ${vstData.voice}`,
      `Style: ${vstData.style}`,
      `Tone: ${vstData.tone}`,
      conversation.sessions.prompt || "You are a helpful assistant."
    ].filter(Boolean).join('\n\n')

    const finalSystemMessage = generateReport ? 
      `${systemInstructions}\n\nPlease generate a comprehensive report summarizing this conversation. Include:\n- Key discussion points\n- Participant contributions\n- Important insights\n- Recommendations` :
      systemInstructions

    const aiMessages = [
      { role: "system", content: finalSystemMessage },
      ...formattedMessages.filter(msg => ['system', 'assistant', 'user'].includes(msg.role))
    ]

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: aiMessages,
        temperature: Number(conversation.sessions.randomness) || 0.7,
        max_tokens: Number(conversation.sessions.max_tokens) || 1000,
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData}`)
    }

    const aiData = await openAIResponse.json()
    const aiContent = aiData.choices[0].message.content

    // Save the AI response to the database
    const { data: savedMessage, error: saveError } = await supabaseClient
      .from('messages')
      .insert({
        content: aiContent,
        role: 'assistant',
        conversation_id: conversationId,
        facilitator_id: conversation.sessions.facilitator_details.id
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving message:', saveError)
      throw saveError
    }

    // If this was a report generation, update the conversation status
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
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
