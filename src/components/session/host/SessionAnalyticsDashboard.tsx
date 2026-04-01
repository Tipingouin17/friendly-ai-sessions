
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
    totalMessages: 0,
    sessionDurationMinutes: 0,
    participantResponseRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const fetchAnalytics = async () => {
      try {
        // Fetch conversation metadata (start time, participant count)
        const { data: conv } = await supabase
          .from('conversations')
          .select('created_at, current_participants, max_participants')
          .eq('id', conversationId)
          .single();

        // Fetch all messages for this conversation
        const { data: messages } = await supabase
          .from('messages')
          .select('role, created_at')
          .eq('conversation_id', conversationId);

        const participantMessages = (messages || []).filter(m => m.role === 'user');
        const totalMessages = participantMessages.length;
        const totalParticipants = conv?.current_participants || 0;

        // Calculate duration from first message to now (or last message)
        let durationMinutes = 0;
        if (messages && messages.length > 0) {
          const sorted = [...messages].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const start = new Date(sorted[0].created_at).getTime();
          const end = new Date(sorted[sorted.length - 1].created_at).getTime();
          durationMinutes = Math.round((end - start) / 60000);
        } else if (conv?.created_at) {
          const start = new Date(conv.created_at).getTime();
          durationMinutes = Math.round((Date.now() - start) / 60000);
        }

        // Participation rate: unique participants who sent a message / total participants
        const uniqueRespondents = new Set(
          participantMessages.map(m => (m as any).name || 'unknown')
        ).size;
        const participantResponseRate =
          totalParticipants > 0
            ? Math.round((uniqueRespondents / totalParticipants) * 100)
            : 0;

        setAnalytics({
          totalParticipants,
          totalMessages,
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
            <p className="text-xs text-muted-foreground">Active in session</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responses</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '—' : analytics.totalMessages}
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
            <p className="text-xs text-muted-foreground">Session length</p>
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
            <p className="text-xs text-muted-foreground">Response rate</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionAnalyticsDashboard;
