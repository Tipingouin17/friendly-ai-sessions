/**
 * EngagementStatsPanel
 *
 * Displays live participant engagement statistics in the host dashboard.
 * Shows skip, pause, and message-host events from session_events.
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from "@/lib/api";
import { SkipForward, PauseCircle, MessageSquare, TrendingUp, Users } from 'lucide-react';

interface EngagementEvent {
  id: number;
  event_type: string;
  data: Record<string, unknown> | null;
  created_at: string;
}

interface ParticipantEngagement {
  participantId: number;
  name: string;
  skipCount: number;
  isPaused: boolean;
  messageCount: number;
  lastActivity: string | null;
}

interface EngagementStatsPanelProps {
  conversationId: number | null;
  participants: Array<{ id: number; name: string }>;
}

const POLLING_INTERVAL = 10000;

export const EngagementStatsPanel: React.FC<EngagementStatsPanelProps> = ({
  conversationId,
  participants,
}) => {
  const [events, setEvents] = useState<EngagementEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!conversationId) return;
    const { data, error } = await api
      .from('session_events')
      .select('id, event_type, data, created_at')
      .eq('conversation_id', conversationId)
      .in('event_type', [
        'participant_skipped',
        'participant_paused',
        'participant_resumed',
        'participant_message_to_host',
      ])
      .order('created_at', { ascending: true });

    if (!error && data) setEvents(data as EngagementEvent[]);
  }, [conversationId]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Build per-participant engagement summary
  const engagementMap = new Map<number, ParticipantEngagement>();

  for (const p of participants) {
    engagementMap.set(p.id, {
      participantId: p.id,
      name: p.name,
      skipCount: 0,
      isPaused: false,
      messageCount: 0,
      lastActivity: null,
    });
  }

  for (const ev of events) {
    const pid = (ev.data?.participant_id as number) ?? null;
    if (!pid) continue;
    const entry = engagementMap.get(pid) ?? {
      participantId: pid,
      name: (ev.data?.participant_name as string) ?? `Participant ${pid}`,
      skipCount: 0,
      isPaused: false,
      messageCount: 0,
      lastActivity: null,
    };

    if (ev.event_type === 'participant_skipped') entry.skipCount += 1;
    if (ev.event_type === 'participant_paused') entry.isPaused = true;
    if (ev.event_type === 'participant_resumed') entry.isPaused = false;
    if (ev.event_type === 'participant_message_to_host') entry.messageCount += 1;
    entry.lastActivity = ev.created_at;
    engagementMap.set(pid, entry);
  }

  const engagementList = Array.from(engagementMap.values());
  const totalSkips = engagementList.reduce((s, e) => s + e.skipCount, 0);
  const pausedCount = engagementList.filter(e => e.isPaused).length;
  const messageCount = engagementList.reduce((s, e) => s + e.messageCount, 0);
  const activeCount = engagementList.filter(e => !e.isPaused).length;

  if (events.length === 0 && participants.length === 0) return null;

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      {/* Summary bar */}
      <button
        onClick={() => setIsExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <TrendingUp className="w-4 h-4 text-indigo-500" />
          Engagement
        </div>
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 justify-end">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-green-500" />
            {activeCount} active
          </span>
          {pausedCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <PauseCircle className="w-3.5 h-3.5" />
              {pausedCount} paused
            </span>
          )}
          {totalSkips > 0 && (
            <span className="flex items-center gap-1 text-gray-400">
              <SkipForward className="w-3.5 h-3.5" />
              {totalSkips} skipped
            </span>
          )}
          {messageCount > 0 && (
            <span className="flex items-center gap-1 text-blue-500">
              <MessageSquare className="w-3.5 h-3.5" />
              {messageCount} msg
            </span>
          )}
          <span className="text-gray-300 ml-1">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded per-participant breakdown */}
      {isExpanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {engagementList.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">No engagement data yet.</p>
          ) : (
            engagementList.map(entry => (
              <div key={entry.participantId} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      entry.isPaused ? 'bg-amber-400' : 'bg-green-400'
                    }`}
                  />
                  <span className="text-sm text-gray-700 truncate max-w-[120px]">{entry.name}</span>
                  {entry.isPaused && (
                    <span className="text-[10px] font-medium bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full">
                      paused
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  {entry.skipCount > 0 && (
                    <span className="flex items-center gap-1">
                      <SkipForward className="w-3 h-3" />
                      {entry.skipCount}
                    </span>
                  )}
                  {entry.messageCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <MessageSquare className="w-3 h-3" />
                      {entry.messageCount}
                    </span>
                  )}
                  {entry.skipCount === 0 && entry.messageCount === 0 && !entry.isPaused && (
                    <span className="text-green-400">active</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
