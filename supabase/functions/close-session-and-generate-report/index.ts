
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { generateEnhancedReportContent } from "../_shared/enhanced-report-generator.ts"
import { analyzeParticipation, extractUserTopics } from "../_shared/message-analysis.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { conversationId, userId } = await req.json()

    if (!conversationId || !userId) {
      throw new Error('Missing conversationId or userId')
    }

    // Verify user owns this conversation
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

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied')
    }

    // Check if session is already ended
    if (conversation.is_session_ended) {
      throw new Error('Session is already ended')
    }

    // Fetch messages for the conversation
    const { data: messages, error: msgError } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgError) {
      throw new Error('Failed to fetch messages: ' + msgError.message)
    }

    // Fetch participants
    const { data: participants, error: partError } = await supabaseClient
      .from('session_participants')
      .select('*')
      .eq('conversation_id', conversationId)

    if (partError) {
      throw new Error('Failed to fetch participants: ' + partError.message)
    }

    // Calculate session analytics
    const { error: analyticsError } = await supabaseClient
      .rpc('calculate_session_analytics', { conv_id: conversationId })

    if (analyticsError) {
      console.error('Failed to calculate analytics:', analyticsError)
    }

    // Generate comprehensive report using enhanced generator
    const participantStats = analyzeParticipation(messages, participants)
    const userTopics = extractUserTopics(messages)
    
    const sessionTitle = conversation.sessions?.title || "Session Report"
    const sessionObjective = conversation.sessions?.objective || "Facilitate productive discussion"
    const participantCount = participants?.length || 0
    const participantDescription = conversation.participant_description || ""

    const reportContent = generateEnhancedReportContent(
      sessionTitle,
      sessionObjective,
      participantCount,
      participantDescription,
      userTopics,
      participantStats,
      participantCount > 10 ? "large group" : participantCount > 4 ? "medium group" : "small group",
      messages
    )

    // Create session report record
    const { data: reportData, error: reportError } = await supabaseClient
      .from('session_reports')
      .insert({
        conversation_id: conversationId,
        report_content: reportContent,
        report_type: 'comprehensive',
        generated_by: userId,
        metadata: {
          participant_count: participantCount,
          message_count: messages.length,
          session_duration: conversation.session_duration_minutes || 0,
          engagement_score: conversation.participant_engagement_score || 0,
          topics: userTopics,
          participation_stats: participantStats,
          highlights: extractHighlights(messages),
          key_insights: extractKeyInsights(messages, participantStats)
        }
      })
      .select()
      .single()

    if (reportError) {
      throw new Error('Failed to create report: ' + reportError.message)
    }

    // Close the session
    const { error: closeError } = await supabaseClient
      .from('conversations')
      .update({
        is_session_ended: true,
        ended_at: new Date().toISOString(),
        status: 'completed',
        final_report_id: reportData.id
      })
      .eq('id', conversationId)

    if (closeError) {
      throw new Error('Failed to close session: ' + closeError.message)
    }

    // Send session ended event to participants
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
      console.error('Failed to create session ended event:', eventError)
    }

    console.log(`Session ${conversationId} closed successfully with report ${reportData.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        reportId: reportData.id,
        reportContent: reportContent,
        sessionData: {
          participantCount,
          messageCount: messages.length,
          duration: conversation.session_duration_minutes || 0,
          engagementScore: conversation.participant_engagement_score || 0
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error in close-session-and-generate-report:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
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
