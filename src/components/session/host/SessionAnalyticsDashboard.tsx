/**
 * Session Analytics Dashboard
 *
 * Session component for the AIfacilitator application.
 */

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SessionAnalyticsDashboardProps {
  conversationId: number;
  className?: string;
}

const SessionAnalyticsDashboard: React.FC<SessionAnalyticsDashboardProps> = ({
  conversationId,
  className
}) => {
  const [analytics, setAnalytics] = useState({
    totalParticipants: 0,
    totalResponses: 0,
    sessionDurationMinutes: 0,
    participantResponseRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const fetchAnalytics = async () => {
      try {
        // 1. Fetch conversation metadata — use created_at as session start time
        const { data: conv } = await supabase
          .from('conversations')
          .select('created_at, is_session_ended')
          .eq('id', conversationId)
          .single();

        // 2. Fetch registered participants (ground truth for participant count)
        const { data: participants } = await supabase
          .from('session_participants')
          .select('id, participant_id')
          .eq('conversation_id', conversationId);

        const totalParticipants = (participants || []).length;

        // 3. Fetch participant messages (role = 'user') with participant_id
        const { data: messages } = await supabase
          .from('messages')
          .select('role, created_at, participant_id')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        const participantMessages = (messages || []).filter(m => m.role === 'user');
        const totalResponses = participantMessages.length;

        // 4. Duration: from conversation.created_at to now (or last message if ended)
        let durationMinutes = 0;
        if (conv?.created_at) {
          const start = new Date(conv.created_at).getTime();
          let end: number;
          if (conv.is_session_ended && messages && messages.length > 0) {
            // Use last message time as end for closed sessions
            end = new Date(messages[messages.length - 1].created_at).getTime();
          } else {
            end = Date.now();
          }
          durationMinutes = Math.max(0, Math.round((end - start) / 60000));
        }

        // 5. Participation rate: unique participant_ids who sent ≥1 message / registered participants
        const uniqueRespondentIds = new Set(
          participantMessages
            .map(m => (m as any).participant_id)
            .filter((id): id is number => id != null && id > 0)
        );
        const participantResponseRate =
          totalParticipants > 0
            ? Math.round((uniqueRespondentIds.size / totalParticipants) * 100)
            : totalResponses > 0 ? 100 : 0; // If no registered participants but there are responses, show 100%

        setAnalytics({
          totalParticipants,
          totalResponses,
          sessionDurationMinutes: durationMinutes,
          participantResponseRate,
        });
      } catch (err) {
        console.error('[Analytics] Error fetching session analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();

    // Refresh every 30 seconds while the dashboard is open
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, [conversationId]);

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return '< 1m';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '—' : analytics.totalParticipants}
            </div>
            <p className="text-xs text-muted-foreground">Registered in session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '—' : analytics.totalResponses}
            </div>
            <p className="text-xs text-muted-foreground">Participant messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '—' : formatDuration(analytics.sessionDurationMinutes)}
            </div>
            <p className="text-xs text-muted-foreground">Since session created</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '—' : `${analytics.participantResponseRate}%`}
            </div>
            <p className="text-xs text-muted-foreground">Participants who responded</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionAnalyticsDashboard;
