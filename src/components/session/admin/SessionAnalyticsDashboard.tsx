/**
 * Session Analytics Dashboard
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionAnalytics } from '@/hooks/useSessionAnalytics';
import { useSessionDiagnostics, DiagnosticSeverity } from '@/hooks/useSessionDiagnostics';
import {
  Users,
  MessageSquare,
  Bot,
  Shield,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
} from 'lucide-react';

interface SessionSummarySnapshot {
  participants: number;
  currentParticipants: number | null;
  attendeeCapacity?: number | null;
  status?: string | null;
  inactivityTimeoutMinutes?: number | null;
  messages: number;
  durationMinutes: number;
  createdAt: string | null;
  endedAt: string | null;
}

interface SessionAnalyticsDashboardProps {
  conversationId: number;
  summarySnapshot?: SessionSummarySnapshot;
  className?: string;
}

const severityBadgeVariant: Record<DiagnosticSeverity, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  info: 'outline',
  success: 'default',
  warning: 'secondary',
  error: 'destructive',
};

const healthBadgeVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  warning: 'secondary',
  error: 'destructive',
  empty: 'outline',
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
};

const formatMinutes = (minutes: number | null | undefined) => {
  if (!minutes || minutes <= 0) return '—';
  return `${minutes}m`;
};

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
};

const visibleDetailEntries = (details: Record<string, string | number | boolean | null>) =>
  Object.entries(details)
    .filter(([key, value]) => value !== null && !['user_agent', 'page_url', 'timestamp', 'diagnostic_scope'].includes(key))
    .slice(0, 6);

const SessionAnalyticsDashboard: React.FC<SessionAnalyticsDashboardProps> = ({
  conversationId,
  summarySnapshot,
  className = ""
}) => {
  const { analytics, isLoading, error } = useSessionAnalytics({
    conversationId,
    realtime: true
  });
  const {
    events: diagnosticEvents,
    summary: diagnosticsSummary,
    isLoading: diagnosticsLoading,
    error: diagnosticsError,
    refetch: refetchDiagnostics,
  } = useSessionDiagnostics({
    conversationId,
    realtime: true,
    limit: 80,
  });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Session Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Analytics Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Session Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {summarySnapshot && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <div className="mb-2 text-sm font-semibold text-indigo-900">Saved session snapshot</div>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div>
                <div className="font-medium text-indigo-800">Final participants</div>
                <div className="text-indigo-700">{summarySnapshot.participants}</div>
              </div>
              <div>
                <div className="font-medium text-indigo-800">Messages</div>
                <div className="text-indigo-700">{summarySnapshot.messages}</div>
              </div>
              <div>
                <div className="font-medium text-indigo-800">Open-to-close</div>
                <div className="text-indigo-700">{formatMinutes(summarySnapshot.durationMinutes)}</div>
              </div>
              <div>
                <div className="font-medium text-indigo-800">Seat limit</div>
                <div className="text-indigo-700">{summarySnapshot.attendeeCapacity && summarySnapshot.attendeeCapacity > 0 ? summarySnapshot.attendeeCapacity : '—'}</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-indigo-700">
              These are the values used on the Past Workshops card. Event-log metrics below are operational traces and can include reconnects, retries, and signalling activity. {summarySnapshot.status === 'auto_closed_inactive' ? `This session was auto-closed after ${summarySnapshot.inactivityTimeoutMinutes ?? 120} minutes without activity.` : ''}
            </p>
          </div>
        )}

        {/* Event-log activity metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
              <div className="text-sm">
              <div className="font-medium">Unique participants</div>
              <div className="text-gray-600">
                {analytics.uniqueParticipants} unique, {analytics.participantJoins} join events
              </div>
              <div className="text-xs text-gray-500">Reconnect/retry events: {analytics.reconnectEvents}. Leaves: {analytics.participantLeaves}.</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" />
            <div className="text-sm">
              <div className="font-medium">Message events</div>
              <div className="text-gray-600">{analytics.messagesSent} sent</div>
              <div className="text-xs text-gray-500">Only messages mirrored into session events.</div>
            </div>
          </div>
        </div>

        {/* AI & Admin Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-purple-500" />
            <div className="text-sm">
              <div className="font-medium">AI Responses</div>
              <div className="text-gray-600">
                {analytics.aiResponses} ({analytics.averageResponseTime}ms avg)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            <div className="text-sm">
              <div className="font-medium">Admin Actions</div>
              <div className="text-gray-600">{analytics.adminActions} taken</div>
            </div>
          </div>
        </div>

        {/* Session Performance */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Event span</span>
            </div>
            <span className="text-sm text-gray-600">
              {formatDuration(analytics.sessionDuration)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Event engagement score</span>
            <Badge variant={analytics.engagementScore > 2 ? "default" : "secondary"}>
              {analytics.engagementScore}/unique participant
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Events</span>
            <Badge variant="outline">{analytics.totalEvents}</Badge>
          </div>

          {analytics.errorCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">Errors</span>
              </div>
              <Badge variant="destructive">{analytics.errorCount}</Badge>
            </div>
          )}
        </div>

        {/* Diagnostics */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <div>
                <div className="text-sm font-semibold">Session Diagnostics</div>
                <div className="text-xs text-gray-500">Latest privacy-safe events and blocker clues</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={healthBadgeVariant[diagnosticsSummary.health]}>
                {diagnosticsSummary.healthLabel}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => refetchDiagnostics()}
                disabled={diagnosticsLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${diagnosticsLoading ? 'animate-spin' : ''}`} />
                <span className="sr-only">Refresh diagnostics</span>
              </Button>
            </div>
          </div>

          {diagnosticsError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {diagnosticsError}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-gray-50 p-2">
                  <div className="font-medium text-gray-700">Blockers</div>
                  <div className="text-gray-600">{diagnosticsSummary.blockerEvents}</div>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <div className="font-medium text-gray-700">Errors</div>
                  <div className="text-gray-600">{diagnosticsSummary.errorEvents}</div>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <div className="font-medium text-gray-700">Recent message events</div>
                  <div className="text-gray-600">{diagnosticsSummary.messageEvents}</div>
                </div>
                <div className="rounded-md bg-gray-50 p-2">
                  <div className="font-medium text-gray-700">Latest event</div>
                  <div className="text-gray-600">{formatTimestamp(diagnosticsSummary.lastEventAt)}</div>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {diagnosticsLoading && diagnosticEvents.length === 0 ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-12 rounded bg-gray-100" />
                    <div className="h-12 rounded bg-gray-100" />
                  </div>
                ) : diagnosticEvents.length === 0 ? (
                  <div className="rounded-md border border-dashed p-3 text-sm text-gray-500">
                    No diagnostics have been logged for this session yet.
                  </div>
                ) : (
                  diagnosticEvents.slice(0, 20).map((event) => (
                    <div key={event.id} className="rounded-md border p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-gray-900">{event.label}</div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(event.createdAt)}
                            {event.participantName ? ` · ${event.participantName}` : ''}
                            {!event.participantName && event.participantId ? ` · Participant ${event.participantId}` : ''}
                          </div>
                        </div>
                        <Badge variant={severityBadgeVariant[event.severity]}>{event.severity}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-gray-600">{event.description}</p>
                      {visibleDetailEntries(event.details).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {visibleDetailEntries(event.details).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="font-normal">
                              {key}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionAnalyticsDashboard;
