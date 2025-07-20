import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

// Import shared modules
import { 
  fetchConversationData, 
  fetchParticipantsData 
} from "../_shared/context-management.ts";

// Import AI generation
import { generateAIWelcomeMessageForSessionStart } from "../handle-facilitator-response/ai-generation.ts";

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
    
    const aiResult = await generateAIWelcomeMessageForSessionStart(
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
})