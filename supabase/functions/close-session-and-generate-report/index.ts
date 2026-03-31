
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateEnhancedReportContent } from "../_shared/enhanced-report-generator.ts"
import { analyzeParticipation, extractUserTopics } from "../_shared/message-analysis.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🚀 Edge function invoked: ${req.method} ${req.url}`);

  if (req.method === 'OPTIONS') {
    console.log("📋 Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables");
      throw new Error('Missing Supabase configuration');
    }

    console.log("🔧 Initializing Supabase client...");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("📥 Request body parsed:", { conversationId: requestBody.conversationId, userId: requestBody.userId });
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      throw new Error('Invalid request body format');
    }

    const { conversationId, userId } = requestBody;

    if (!conversationId || !userId) {
      console.error("❌ Missing required parameters:", { conversationId, userId });
      throw new Error('Missing conversationId or userId');
    }

    // Step 1: Verify user owns this conversation
    console.log("🔍 Step 1: Verifying conversation ownership...");
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select(`
        *,
        sessions!conversations_sessions_id_fkey (
          id,
          title,
          objective,
          session_type,
          duration_minutes
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (convError) {
      console.error("❌ Error fetching conversation:", convError);
      throw new Error(`Conversation query failed: ${convError.message}`);
    }

    if (!conversation) {
      console.error("❌ Conversation not found or access denied");
      throw new Error('Conversation not found or access denied');
    }

    console.log("✅ Conversation ownership verified");

    // Check if session is already ended
    if (conversation.is_session_ended) {
      console.error("❌ Session is already ended");
      throw new Error('Session is already ended');
    }

    // Step 2: Fetch messages for the conversation
    console.log("🔍 Step 2: Fetching conversation messages...");
    const { data: messages, error: msgError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      console.error("❌ Error fetching messages:", msgError);
      throw new Error(`Failed to fetch messages: ${msgError.message}`);
    }

    console.log(`✅ Fetched ${messages?.length || 0} messages`);

    // Step 3: Fetch participants
    console.log("🔍 Step 3: Fetching session participants...");
    const { data: participants, error: partError } = await supabaseClient
      .from('session_participants')
      .select('*')
      .eq('conversation_id', conversationId)

    if (partError) {
      console.error("❌ Error fetching participants:", partError);
      throw new Error(`Failed to fetch participants: ${partError.message}`);
    }

    console.log(`✅ Fetched ${participants?.length || 0} participants`);

    // Step 4a: Set ended_at FIRST so that calculate_session_analytics can compute duration correctly
    console.log("🔍 Step 4a: Setting ended_at timestamp before analytics...");
    const endedAt = new Date().toISOString();
    const { error: endedAtError } = await supabaseClient
      .from('conversations')
      .update({ ended_at: endedAt })
      .eq('id', conversationId);
    if (endedAtError) {
      console.error("⚠️ Warning: Failed to set ended_at:", endedAtError);
    } else {
      console.log("✅ ended_at timestamp set:", endedAt);
    }

    // Step 4b: Calculate session analytics (now ended_at is set, so duration will be correct)
    console.log("🔍 Step 4b: Calculating session analytics...");
    const { error: analyticsError } = await supabaseClient
      .rpc('calculate_session_analytics', { conv_id: conversationId })

    if (analyticsError) {
      console.error("⚠️ Warning: Failed to calculate analytics:", analyticsError);
      // Don't throw here, continue with report generation
    } else {
      console.log("✅ Session analytics calculated");
    }

    // Step 4c: Fetch updated analytics values after calculate_session_analytics ran
    const { data: updatedConv } = await supabaseClient
      .from('conversations')
      .select('session_duration_minutes, participant_engagement_score')
      .eq('id', conversationId)
      .single();
    const sessionDurationMinutes = updatedConv?.session_duration_minutes || 0;
    const engagementScore = updatedConv?.participant_engagement_score || 0;

    // Step 5: Generate comprehensive report
    console.log("🔍 Step 5: Generating comprehensive report...");
    const participantStats = analyzeParticipation(messages || [], participants || []);
    const userTopics = extractUserTopics(messages || []);

    const sessionTitle = conversation.sessions?.title || "Session Report";
    const sessionObjective = conversation.sessions?.objective || "Facilitate productive discussion";
    const participantCount = participants?.length || 0;
    const participantDescription = conversation.participant_description || "";

    const reportContent = generateEnhancedReportContent(
      sessionTitle,
      sessionObjective,
      participantCount,
      participantDescription,
      userTopics,
      participantStats,
      participantCount > 10 ? "large group" : participantCount > 4 ? "medium group" : "small group",
      messages || []
    );

    console.log("✅ Report content generated");

    // Step 6: Create session report record
    console.log("🔍 Step 6: Creating session report record...");
    const { data: reportData, error: reportError } = await supabaseClient
      .from('session_reports')
      .insert({
        conversation_id: conversationId,
        report_content: reportContent,
        report_type: 'comprehensive',
        generated_by: userId,
        metadata: {
          participant_count: participantCount,
          message_count: messages?.length || 0,
          session_duration: sessionDurationMinutes,
          engagement_score: engagementScore,
          topics: userTopics,
          participation_stats: participantStats,
          highlights: extractHighlights(messages || []),
          key_insights: extractKeyInsights(messages || [], participantStats)
        }
      })
      .select()
      .single()

    if (reportError) {
      console.error("❌ Error creating report:", reportError);
      throw new Error(`Failed to create report: ${reportError.message}`);
    }

    console.log("✅ Session report record created:", reportData.id);

    // Step 7: Close the session (ended_at already set in Step 4a; set remaining closure fields)
    console.log("🔍 Step 7: Closing the session...");
    const { error: closeError } = await supabaseClient
      .from('conversations')
      .update({
        is_session_ended: true,
        status: 'completed',
        final_report_id: reportData.id
      })
      .eq('id', conversationId)

    if (closeError) {
      console.error("❌ Error closing session:", closeError);
      throw new Error(`Failed to close session: ${closeError.message}`);
    }

    console.log("✅ Session closed successfully");

    // Step 8: Send session ended event to participants
    console.log("🔍 Step 8: Creating session ended event...");
    const { error: eventError } = await supabaseClient
      .from('session_events')
      .insert({
        conversation_id: conversationId,
        event_type: 'session_ended',
        data: {
          ended_by: userId,
          report_id: reportData.id,
          ended_at: new Date().toISOString()
        }
      })

    if (eventError) {
      console.error("⚠️ Warning: Failed to create session ended event:", eventError);
      // Don't throw here, the main operation succeeded
    } else {
      console.log("✅ Session ended event created");
    }

    console.log(`🎉 Session ${conversationId} closed successfully with report ${reportData.id}`);

    const responseData = {
      success: true,
      reportId: reportData.id,
      reportContent: reportContent,
      sessionData: {
        participantCount,
        messageCount: messages?.length || 0,
        duration: sessionDurationMinutes,
        engagementScore: engagementScore
      }
    };

    console.log("📤 Sending success response");
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('💥 Error in close-session-and-generate-report:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.log("📤 Sending error response:", errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper functions for metadata
function extractHighlights(messages: any[]): string[] {
  const userMessages = messages.filter(m => m.role === 'user');
  return userMessages
    .filter(m => m.content && m.content.length > 50)
    .slice(0, 5)
    .map(m => m.content.substring(0, 150) + (m.content.length > 150 ? '...' : ''));
}

function extractKeyInsights(messages: any[], participantStats: any) {
  const insights = [];

  if (participantStats.participationBalance > 0.7) {
    insights.push("High engagement with balanced participation");
  }

  const userMessages = messages.filter(m => m.role === 'user');
  const longMessages = userMessages.filter(m => m.content && m.content.length > 100).length;

  if (longMessages > userMessages.length / 2) {
    insights.push("In-depth contributions and thoughtful responses");
  }

  return insights;
}
