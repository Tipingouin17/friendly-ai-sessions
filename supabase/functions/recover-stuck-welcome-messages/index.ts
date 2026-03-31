
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Starting recovery of stuck welcome messages...')

    // Find conversations stuck in ai_generating status with no messages
    const { data: stuckConversations, error: fetchError } = await supabase
      .from('conversations')
      .select(`
        id,
        sessions_id,
        participant_description,
        language,
        welcome_message_status,
        session_started,
        sessions!inner(
          id,
          title,
          objective,
          facilitator_details:facilitators!inner(
            id,
            title,
            details,
            profile_picture
          )
        )
      `)
      .eq('welcome_message_status', 'ai_generating')
      .eq('session_started', true)

    if (fetchError) {
      console.error('❌ Error fetching stuck conversations:', fetchError)
      throw fetchError
    }

    console.log(`🔍 Found ${stuckConversations?.length || 0} conversations stuck in ai_generating status`)

    let recoveredCount = 0
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    for (const conversation of stuckConversations || []) {
      console.log(`🔧 Processing stuck conversation ${conversation.id}...`)

      // Check if messages already exist
      const { data: existingMessages, error: msgError } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversation.id)
        .limit(1)

      if (msgError) {
        console.error(`❌ Error checking messages for conversation ${conversation.id}:`, msgError)
        continue
      }

      if (existingMessages && existingMessages.length > 0) {
        console.log(`✅ Conversation ${conversation.id} already has messages, updating status to ai_ready`)
        await supabase
          .from('conversations')
          .update({ welcome_message_status: 'ai_ready' })
          .eq('id', conversation.id)
        recoveredCount++
        continue
      }

      // Try to generate AI welcome message
      if (openaiApiKey && conversation.sessions?.facilitator_details?.title && conversation.sessions?.objective) {
        try {
          console.log(`🤖 Attempting AI generation for conversation ${conversation.id}...`)

          const systemPrompt = `You are ${conversation.sessions.facilitator_details.title}, an expert facilitator. ${conversation.sessions.facilitator_details.details || ''}

Your role is to create a warm, personalized welcome message for the start of this session. Consider:

SESSION CONTEXT:
- Title: ${conversation.sessions.title}
- Objective: ${conversation.sessions.objective}
- Participants: ${conversation.participant_description || 'participants'}

Create a welcome message that:
1. Shows genuine enthusiasm for working with this specific type of participant
2. Connects the session topic to their likely professional interests and challenges
3. Uses appropriate terminology and examples relevant to their field
4. Encourages active participation and knowledge sharing
5. Sets a collaborative, professional tone for the discussion

The message should be approximately 3-4 paragraphs and feel personally crafted for this audience.`

          const userPrompt = `Generate a personalized welcome message for a session titled "${conversation.sessions.title}" with the objective: "${conversation.sessions.objective}"

The participants are described as: "${conversation.participant_description || 'participants'}"

Create a welcome message that feels personally crafted for this audience and encourages engagement.`

          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 400,
              temperature: 0.7,
            }),
          })

          if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`)
          }

          const data = await response.json()
          const aiContent = data.choices?.[0]?.message?.content

          if (aiContent) {
            // Insert AI welcome message
            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversation.id,
                content: {
                  text: aiContent,
                  avatar: conversation.sessions.facilitator_details.profile_picture || `/api/avatar?name=${encodeURIComponent(conversation.sessions.facilitator_details.title)}&variant=beam&palette=2`
                },
                role: 'assistant',
                name: conversation.sessions.facilitator_details.title
              })

            if (!insertError) {
              await supabase
                .from('conversations')
                .update({ welcome_message_status: 'ai_ready' })
                .eq('id', conversation.id)

              console.log(`✅ AI welcome message generated for conversation ${conversation.id}`)
              recoveredCount++
              continue
            }
          }
        } catch (aiError) {
          console.error(`❌ AI generation failed for conversation ${conversation.id}:`, aiError)
        }
      }

      // Fallback to template generation
      console.log(`📝 Generating template fallback for conversation ${conversation.id}...`)
      try {
        const templateContent = `Welcome to ${conversation.sessions?.title || 'this session'}! I'm ${conversation.sessions?.facilitator_details?.title || 'your facilitator'}, and I'm excited to have you join us today.

Our objective for today is: ${conversation.sessions?.objective || 'to have a productive discussion'}.

To get us started, please introduce yourself and share what brings you to this session. What are you hoping to learn or contribute?

I'm looking forward to our discussion and learning from each of your unique perspectives!`

        const { error: templateError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            content: {
              text: templateContent,
              avatar: conversation.sessions?.facilitator_details?.profile_picture || `/api/avatar?name=${encodeURIComponent(conversation.sessions?.facilitator_details?.title || 'Facilitator')}&variant=beam&palette=2`
            },
            role: 'assistant',
            name: conversation.sessions?.facilitator_details?.title || 'Facilitator'
          })

        if (!templateError) {
          await supabase
            .from('conversations')
            .update({ welcome_message_status: 'template_ready' })
            .eq('id', conversation.id)

          console.log(`✅ Template welcome message generated for conversation ${conversation.id}`)
          recoveredCount++
        } else {
          console.error(`❌ Template generation failed for conversation ${conversation.id}:`, templateError)

          // Mark as failed
          await supabase
            .from('conversations')
            .update({ welcome_message_status: 'failed' })
            .eq('id', conversation.id)
        }
      } catch (templateError) {
        console.error(`❌ Template generation failed for conversation ${conversation.id}:`, templateError)
      }
    }

    console.log(`🎉 Recovery complete: ${recoveredCount} conversations recovered`)

    return new Response(
      JSON.stringify({
        success: true,
        total_stuck: stuckConversations?.length || 0,
        recovered: recoveredCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 Recovery function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
