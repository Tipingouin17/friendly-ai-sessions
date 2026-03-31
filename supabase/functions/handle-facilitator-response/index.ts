
// Import required dependencies
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Import shared modules
import {
  fetchConversationData,
  fetchParticipantsData
} from "../_shared/context-management.ts";

// Import local modules
import { parseRequest, initSupabaseClient, corsHeaders, createErrorResponse } from "./request-handler.ts";
import { processResponse } from "./response-processor.ts";
import {
  checkAndLockGeneration,
  unlockGeneration,
  checkDatabaseLock,
  checkExistingMessages,
  releaseDatabaseLock,
  createFallbackWelcomeMessage
} from "./message-deduplication.ts";

serve(async (req) => {
  const requestStart = performance.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  console.log(`🚀 [${requestId}] Edge function started:`, {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    userAgent: req.headers.get('user-agent')
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`✅ [${requestId}] CORS preflight handled`);
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const clientStart = performance.now();
    const supabase = initSupabaseClient();
    const clientDuration = performance.now() - clientStart;
    console.log(`🔧 [${requestId}] Supabase client initialized in ${clientDuration.toFixed(2)}ms`);

    // Parse and validate the request with enhanced debugging
    console.log(`📥 [${requestId}] Parsing request...`);
    const { messages, conversationId, generateReport, wrapUpSession, sessionStart } = await parseRequest(req);
    console.log(`✅ [${requestId}] Request parsed successfully:`, {
      conversationId,
      messageCount: messages.length,
      flags: { generateReport, wrapUpSession, sessionStart }
    });

    // Check OpenAI API key availability
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log(`🔑 [${requestId}] OpenAI API key status:`, {
      hasKey: !!openaiApiKey,
      keyPrefix: openaiApiKey ? openaiApiKey.substring(0, 10) + '...' : 'undefined'
    });

    if (!openaiApiKey) {
      console.error(`❌ [${requestId}] OpenAI API key not found in environment`);
      return createErrorResponse(new Error('OpenAI API key not configured'));
    }

    // Enhanced session start handling with multi-level deduplication and fallback
    if (sessionStart) {
      console.log(`🎯 [${requestId}] Session start detected - applying enhanced deduplication with fallback`);

      // Level 1: In-memory lock check (now allows retries)
      if (!checkAndLockGeneration(conversationId, requestId)) {
        console.log(`🚫 [${requestId}] In-memory lock failed - too many attempts`);

        // Try creating fallback message instead of failing
        console.log(`🔄 [${requestId}] Attempting fallback welcome message creation`);
        const fallbackSuccess = await createFallbackWelcomeMessage(supabase, conversationId);

        if (fallbackSuccess) {
          return new Response(
            JSON.stringify({
              message: 'Fallback welcome message created successfully',
              status: 'fallback_completed',
              requestId
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return new Response(
          JSON.stringify({
            error: 'Welcome message generation failed after multiple attempts',
            requestId
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      try {
        // Level 2: Check if welcome message already exists
        const hasExistingMessage = await checkExistingMessages(supabase, conversationId);
        if (hasExistingMessage) {
          console.log(`✅ [${requestId}] Welcome message already exists, skipping generation`);
          unlockGeneration(conversationId, requestId);
          return new Response(
            JSON.stringify({
              message: 'Welcome message already exists',
              status: 'completed'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        // Level 3: Database-level lock (now more permissive)
        const databaseLockAcquired = await checkDatabaseLock(supabase, conversationId, requestId);
        if (!databaseLockAcquired) {
          console.log(`🚫 [${requestId}] Database lock failed - trying fallback`);
          unlockGeneration(conversationId, requestId);

          // Try fallback instead of failing
          const fallbackSuccess = await createFallbackWelcomeMessage(supabase, conversationId);
          if (fallbackSuccess) {
            return new Response(
              JSON.stringify({
                message: 'Fallback welcome message created',
                status: 'fallback_completed'
              }),
              {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          }

          return new Response(
            JSON.stringify({
              error: 'Welcome message generation failed - database lock unsuccessful',
              requestId
            }),
            {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        console.log(`🔒 [${requestId}] All locks acquired successfully, proceeding with AI generation`);

      } catch (lockError) {
        console.error(`❌ [${requestId}] Error during lock acquisition:`, lockError);
        unlockGeneration(conversationId, requestId);
        await releaseDatabaseLock(supabase, conversationId, 'pending');

        // Try fallback on error
        const fallbackSuccess = await createFallbackWelcomeMessage(supabase, conversationId);
        if (fallbackSuccess) {
          return new Response(
            JSON.stringify({
              message: 'Fallback welcome message created after error',
              status: 'fallback_completed'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        return createErrorResponse(lockError);
      }
    }

    // ENHANCED CONTEXT MANAGEMENT: Fetch conversation and participants data
    console.log(`📋 [${requestId}] Fetching comprehensive conversation data for ID: ${conversationId}...`);
    const contextStart = performance.now();

    const conversation = await fetchConversationData(supabase, conversationId);
    const participants = await fetchParticipantsData(supabase, conversationId);

    const contextDuration = performance.now() - contextStart;
    console.log(`✅ [${requestId}] Comprehensive context fetched in ${contextDuration.toFixed(2)}ms:`, {
      hasConversation: !!conversation,
      participantCount: participants?.length || 0,
      facilitatorName: conversation?.sessions?.facilitator_details?.title,
      sessionObjective: conversation?.sessions?.objective?.substring(0, 50) + '...',
      participantDescription: conversation?.participant_description,
      language: conversation?.language || 'en',
      conversationStructure: {
        hasSession: !!conversation?.sessions,
        sessionKeys: conversation?.sessions ? Object.keys(conversation.sessions) : [],
        hasFacilitatorDetails: !!conversation?.sessions?.facilitator_details,
        facilitatorDetailsKeys: conversation?.sessions?.facilitator_details ? Object.keys(conversation.sessions.facilitator_details) : []
      },
      contextQuality: 'comprehensive'
    });

    try {
      // Process the request and generate a response with comprehensive context
      console.log(`🤖 [${requestId}] Starting comprehensive response processing...`);
      const processingStart = performance.now();

      const responseObject = await processResponse(
        supabase,
        messages,
        conversationId,
        conversation,
        participants,
        generateReport,
        wrapUpSession,
        sessionStart
      );

      const processingDuration = performance.now() - processingStart;
      const totalDuration = performance.now() - requestStart;

      console.log(`🎉 [${requestId}] Comprehensive response processing complete:`, {
        processingDuration: `${processingDuration.toFixed(2)}ms`,
        totalDuration: `${totalDuration.toFixed(2)}ms`,
        responseData: {
          id: responseObject.id,
          isReport: responseObject.is_report,
          contentLength: responseObject.content.length,
          generationMethod: responseObject.metrics?.generationMethod,
          hasAvatar: !!responseObject.avatar,
          hasFacilitatorContext: !!responseObject.facilitator_context,
          hasSessionContext: !!responseObject.session_context,
          language: responseObject.session_context?.language || 'en',
          contextQuality: responseObject.metrics?.contextQuality || 'comprehensive'
        }
      });

      console.log(`📤 [${requestId}] Sending comprehensive facilitator response:`, {
        id: responseObject.id,
        isReport: responseObject.is_report,
        contentLength: responseObject.content.length,
        metrics: responseObject.metrics,
        wrapUpTriggered: wrapUpSession,
        sessionStartTriggered: sessionStart,
        facilitatorName: responseObject.facilitator_context?.name,
        sessionObjective: responseObject.session_context?.objective?.substring(0, 50) + '...',
        language: responseObject.session_context?.language || 'en',
        contextQuality: 'comprehensive'
      });

      // Clean up locks on successful completion
      if (sessionStart) {
        unlockGeneration(conversationId, requestId);
        await releaseDatabaseLock(supabase, conversationId, 'ai_ready');
      }

      return new Response(
        JSON.stringify(responseObject),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (processingError) {
      console.error(`💥 [${requestId}] Processing error:`, processingError);

      // Clean up locks on processing error
      if (sessionStart) {
        unlockGeneration(conversationId, requestId);
        await releaseDatabaseLock(supabase, conversationId, 'pending');

        // Try fallback on processing error
        console.log(`🔄 [${requestId}] Attempting fallback after processing error`);
        const fallbackSuccess = await createFallbackWelcomeMessage(supabase, conversationId);
        if (fallbackSuccess) {
          return new Response(
            JSON.stringify({
              message: 'Fallback welcome message created after processing error',
              status: 'fallback_completed'
            }),
            {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      throw processingError;
    }

  } catch (error) {
    const totalDuration = performance.now() - requestStart;
    console.error(`💥 [${requestId}] Edge function error:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration.toFixed(2)}ms`,
      timestamp: new Date().toISOString()
    });

    return createErrorResponse(error);
  }
});
