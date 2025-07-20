import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Import shared modules
import { 
  fetchConversationData, 
  fetchParticipantsData 
} from "../_shared/context-management.ts";

// AI generation will be implemented locally

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const requestStart = performance.now();
  const requestId = `ai-welcome-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log(`🎯 [${requestId}] AI Welcome Generation function started:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight handled`);
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log(`🔧 [${requestId}] Supabase client initialized`);
    
    // Parse request body
    const { conversationId } = await req.json();
    
    if (!conversationId) {
      console.error(`❌ [${requestId}] Missing conversationId in request`);
      return new Response(
        JSON.stringify({ error: 'conversationId is required' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📋 [${requestId}] Processing AI welcome message for conversation: ${conversationId}`);

    // Check OpenAI API key availability
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(`❌ [${requestId}] OpenAI API key not found`);
      
      // Fall back to template welcome message via database function
      const { error: fallbackError } = await supabase.rpc('create_template_welcome_message', {
        conversation_id_param: conversationId
      });
      
      if (fallbackError) {
        console.error(`❌ [${requestId}] Template fallback failed:`, fallbackError);
        throw new Error(`Welcome message generation failed: ${fallbackError.message}`);
      }
      
      console.log(`✅ [${requestId}] Fell back to template welcome message`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          method: 'template_fallback',
          message: 'Welcome message generated using template'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch conversation and participants data
    console.log(`📊 [${requestId}] Fetching conversation and participant data...`);
    
    const conversation = await fetchConversationData(supabase, conversationId);
    const participants = await fetchParticipantsData(supabase, conversationId);
    
    if (!conversation) {
      console.error(`❌ [${requestId}] Conversation not found: ${conversationId}`);
      return new Response(
        JSON.stringify({ error: 'Conversation not found' }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`✅ [${requestId}] Context data loaded:`, {
      conversationId,
      hasSession: !!conversation.sessions,
      facilitatorName: conversation?.sessions?.facilitator_details?.title,
      sessionTitle: conversation?.sessions?.title,
      participantDescription: conversation?.participant_description,
      language: conversation?.language,
      participantCount: participants?.length || 0
    });

    // Check if welcome message already exists
    const { data: existingMessages, error: messageCheckError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .limit(1);

    if (messageCheckError) {
      console.error(`❌ [${requestId}] Error checking existing messages:`, messageCheckError);
      throw new Error(`Failed to check existing messages: ${messageCheckError.message}`);
    }

    if (existingMessages && existingMessages.length > 0) {
      console.log(`⚠️ [${requestId}] Welcome message already exists for conversation ${conversationId}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          method: 'already_exists',
          message: 'Welcome message already exists'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if we have sufficient context for AI generation
    const hasRichContext = !!(
      conversation?.sessions?.facilitator_details?.title && 
      conversation?.sessions?.objective &&
      conversation?.participant_description
    );

    console.log(`🎯 [${requestId}] Context analysis:`, {
      hasRichContext,
      hasFacilitatorTitle: !!conversation?.sessions?.facilitator_details?.title,
      hasObjective: !!conversation?.sessions?.objective,
      hasParticipantDescription: !!conversation?.participant_description,
      language: conversation?.language || 'en'
    });

    if (!hasRichContext) {
      console.log(`⚠️ [${requestId}] Insufficient context for AI generation, using template fallback`);
      
      // Fall back to template welcome message
      const { error: fallbackError } = await supabase.rpc('create_template_welcome_message', {
        conversation_id_param: conversationId
      });
      
      if (fallbackError) {
        console.error(`❌ [${requestId}] Template fallback failed:`, fallbackError);
        throw new Error(`Template welcome message generation failed: ${fallbackError.message}`);
      }
      
      console.log(`✅ [${requestId}] Generated template welcome message due to insufficient context`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          method: 'template_insufficient_context',
          message: 'Welcome message generated using template due to insufficient context'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate AI welcome message
    console.log(`🤖 [${requestId}] Generating AI welcome message with rich context...`);
    
    const aiResult = await generateAIWelcomeMessage(
      supabase,
      conversationId,
      conversation,
      participants,
      openaiApiKey,
      requestId
    );

    const totalDuration = performance.now() - requestStart;
    
    console.log(`🎉 [${requestId}] AI welcome message generation completed:`, {
      success: true,
      method: 'ai_generated',
      contentLength: aiResult.content?.length || 0,
      language: conversation?.language || 'en',
      participantType: conversation?.participant_description,
      facilitatorName: aiResult.facilitator_context?.name,
      sessionTitle: aiResult.session_context?.title,
      totalDuration: `${totalDuration.toFixed(2)}ms`,
      messageId: aiResult.insertedMessage?.id
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        method: 'ai_generated',
        message: 'AI welcome message generated successfully',
        data: {
          contentLength: aiResult.content?.length || 0,
          language: conversation?.language || 'en',
          participantType: conversation?.participant_description,
          messageId: aiResult.insertedMessage?.id
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const totalDuration = performance.now() - requestStart;
    console.error(`💥 [${requestId}] AI Welcome Generation error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'AI welcome message generation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Generate AI welcome message for session start
 */
async function generateAIWelcomeMessage(
  supabase: any,
  conversationId: number,
  conversation: any,
  participants: any[],
  openaiApiKey: string,
  requestId: string
): Promise<any> {
  try {
    console.log(`🎯 [${requestId}] Starting AI welcome message generation for session start`);
    
    // Extract facilitator context
    const facilitatorTitle = conversation?.sessions?.facilitator_details?.title || 'Facilitator';
    const facilitatorDetails = conversation?.sessions?.facilitator_details?.details || '';
    const facilitatorAvatar = conversation?.sessions?.facilitator_details?.profile_picture || 
      `/api/avatar?name=${encodeURIComponent(facilitatorTitle)}&variant=beam&palette=2`;
    
    // Extract session context
    const sessionTitle = conversation?.sessions?.title || 'Session';
    const sessionObjective = conversation?.sessions?.objective || '';
    const participantDescription = conversation?.participant_description || 'participants';
    const sessionLanguage = conversation?.language || 'en';
    
    console.log(`🌍 [${requestId}] Welcome message context:`, {
      facilitatorTitle,
      sessionTitle,
      participantDescription,
      sessionLanguage,
      participantCount: participants?.length || 0,
      hasObjective: !!sessionObjective
    });

    // Create language-specific welcome message prompt
    const languageInstructions = sessionLanguage === 'fr' 
      ? 'IMPORTANT: Vous devez répondre entièrement en français. Utilisez un français professionnel et chaleureux.'
      : 'IMPORTANT: You must respond entirely in English. Use professional and warm English.';
    
    const systemPrompt = `You are ${facilitatorTitle}, an expert facilitator. ${facilitatorDetails}

${languageInstructions}

Your role is to create a warm, personalized welcome message for the start of this session. Consider:

SESSION CONTEXT:
- Title: ${sessionTitle}
- Objective: ${sessionObjective}
- Participants: ${participantDescription}

PERSONALIZATION REQUIREMENTS:
1. Address the specific participant type ("${participantDescription}") appropriately
2. Connect the session objective to their likely interests and context
3. Use professional but warm tone suitable for the participant group
4. Reference relevant aspects of your expertise that relate to their field
5. Create an inclusive, engaging opening that encourages participation

WELCOME MESSAGE STRUCTURE:
1. Enthusiastic greeting and self-introduction
2. Brief mention of session title and its relevance to their field
3. Clear statement of the session objective tailored to their context
4. Invitation to participate and share perspectives
5. Express genuine interest in learning from their unique perspectives

Make the welcome message feel personally crafted for this specific group of ${participantDescription} while maintaining professionalism and expertise.`;

    const languagePhrase = sessionLanguage === 'fr' ? 'en français' : 'in English';
    const userPrompt = `Generate a personalized welcome message ${languagePhrase} for a session titled "${sessionTitle}" with the objective: "${sessionObjective}"

The participants are described as: "${participantDescription}"
Expected participant count: ${participants?.length || 0}

Create a welcome message that:
1. Shows genuine enthusiasm for working with this specific type of participant
2. Connects the session topic to their likely professional interests and challenges
3. Uses appropriate terminology and examples relevant to their field
4. Encourages active participation and knowledge sharing
5. Sets a collaborative, professional tone for the discussion

The message should be approximately 3-4 paragraphs and feel personally crafted for this audience.`;

    console.log(`🚀 [${requestId}] Calling OpenAI API for welcome message generation...`);

    const apiStartTime = Date.now();
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
    });

    const apiDuration = Date.now() - apiStartTime;
    console.log(`⏱️ [${requestId}] OpenAI API call completed in ${apiDuration}ms with status: ${response.status}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [${requestId}] OpenAI API error:`, {
        status: response.status,
        statusText: response.statusText,
        errorData,
        duration: apiDuration
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;
    
    if (!aiContent) {
      console.error(`❌ [${requestId}] No content received from OpenAI for welcome message`);
      throw new Error('No content received from OpenAI API for welcome message');
    }

    // Create the welcome message record
    const welcomeMessageData = {
      conversation_id: conversationId,
      content: {
        text: aiContent,
        avatar: facilitatorAvatar
      },
      role: 'assistant',
      name: facilitatorTitle,
      created_at: new Date().toISOString()
    };

    console.log(`💾 [${requestId}] Inserting AI welcome message into database...`);
    
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert(welcomeMessageData)
      .select()
      .single();

    if (insertError) {
      console.error(`❌ [${requestId}] Error inserting welcome message:`, insertError);
      throw new Error(`Failed to insert welcome message: ${insertError.message}`);
    }

    // Update conversation status to indicate AI welcome message is ready
    await supabase
      .from('conversations')
      .update({ welcome_message_status: 'ai_ready' })
      .eq('id', conversationId);

    console.log(`✅ [${requestId}] AI welcome message generated and stored successfully:`, {
      contentLength: aiContent.length,
      language: sessionLanguage,
      participantType: participantDescription,
      facilitatorUsed: facilitatorTitle,
      sessionUsed: sessionTitle,
      duration: apiDuration,
      tokensUsed: data.usage?.total_tokens,
      messageId: insertedMessage?.id
    });

    return {
      content: aiContent,
      avatar: facilitatorAvatar,
      facilitator_context: { name: facilitatorTitle },
      session_context: { title: sessionTitle },
      generationMethod: 'ai_welcome_session_start',
      insertedMessage
    };
    
  } catch (error) {
    console.error(`❌ [${requestId}] AI welcome message generation failed:`, {
      error: error.message,
      stack: error.stack,
      conversationId,
      facilitatorTitle: conversation?.sessions?.facilitator_details?.title
    });
    
    // Update conversation status to indicate failure
    try {
      await supabase
        .from('conversations')
        .update({ welcome_message_status: 'failed' })
        .eq('id', conversationId);
    } catch (statusError) {
      console.error(`❌ [${requestId}] Error updating welcome message status to failed:`, statusError);
    }
    
    throw error;
  }
}