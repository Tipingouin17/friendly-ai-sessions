import React from 'react';
import { Activity, BarChart3, Mic, RefreshCw, Volume2 } from 'lucide-react';
import api from '@/lib/api';
import { useFacilitationAnalytics } from '@/hooks/useFacilitationAnalytics';
import type { SessionFacilitationAnalyticsSnapshot } from '@/types/facilitator';

const formatPercent = (value?: number | null) => `${Math.round((value ?? 0) * 100)}%`;

const MetricCard = ({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: React.ElementType }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="mt-2 text-xs text-slate-500">{detail}</p>
  </div>
);

export const FacilitationAnalyticsDashboard = () => {
  const [conversationInput, setConversationInput] = React.useState('');
  const [selectedConversationId, setSelectedConversationId] = React.useState<number | null>(null);
  const [snapshots, setSnapshots] = React.useState<SessionFacilitationAnalyticsSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = React.useState(false);
  const [snapshotError, setSnapshotError] = React.useState<string | null>(null);

  const { analytics, summary, isLoading, error, refetch } = useFacilitationAnalytics({
    conversationId: selectedConversationId,
    realtime: Boolean(selectedConversationId),
    persist: Boolean(selectedConversationId),
  });

  const loadSnapshots = React.useCallback(async () => {
    setIsLoadingSnapshots(true);
    setSnapshotError(null);
    const { data, error: loadError } = await api
      .from<SessionFacilitationAnalyticsSnapshot>('session_facilitation_analytics')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (loadError) {
      setSnapshotError(loadError.message);
    } else {
      setSnapshots((data ?? []) as SessionFacilitationAnalyticsSnapshot[]);
    }
    setIsLoadingSnapshots(false);
  }, []);

  React.useEffect(() => {
    void loadSnapshots();
  }, [loadSnapshots]);

  const inspectConversation = () => {
    const parsed = Number(conversationInput);
    if (Number.isFinite(parsed) && parsed > 0) setSelectedConversationId(parsed);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Phase 3 facilitation intelligence</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Speech, avatar, and process analytics</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              This dashboard augments the compact event audit strips with deeper live facilitation metrics derived from participant speech turns, facilitator TTS playback, and persisted analytics snapshots.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={conversationInput}
              onChange={(event) => setConversationInput(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') inspectConversation(); }}
              placeholder="Conversation ID"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <button
              type="button"
              onClick={inspectConversation}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              disabled={!conversationInput.trim()}
            >
              Inspect
            </button>
          </div>
        </div>
      </div>

      {selectedConversationId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Live conversation {selectedConversationId}</h3>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading live facilitation analytics…</div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
          ) : analytics && summary ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Health" value={`${summary.healthPercent}%`} detail="Composite balance, coverage, drift, and voice completion score." icon={Activity} />
                <MetricCard label="Speech turns" value={String(analytics.speechTurnCount)} detail={`${analytics.spokenWordCount} recognized participant words.`} icon={Mic} />
                <MetricCard label="Avatar/TTS" value={String(analytics.ttsEventCount)} detail={`${formatPercent(analytics.completedTtsRate)} completed voice playback rate.`} icon={Volume2} />
                <MetricCard label="Topic drift" value={`${summary.driftPercent}%`} detail="Higher values suggest recent speech vocabulary diverged from earlier discussion." icon={BarChart3} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900">Participant balance</h4>
                <div className="mt-4 space-y-3">
                  {analytics.participantMetrics.length === 0 ? (
                    <p className="text-sm text-slate-500">No persisted speech turns yet.</p>
                  ) : analytics.participantMetrics.map((metric) => (
                    <div key={`${metric.participantId}-${metric.label}`}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{metric.label}</span>
                        <span>{metric.turnCount} turns · {metric.wordCount} words · {formatPercent(metric.share)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.max(4, metric.share * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">No analytics are available for this conversation yet.</div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-900">Recent persisted analytics snapshots</h3>
          <button type="button" onClick={() => void loadSnapshots()} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            {isLoadingSnapshots ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {snapshotError ? (
          <div className="p-4 text-sm text-rose-700">{snapshotError}</div>
        ) : snapshots.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No Phase 3 facilitation analytics snapshots have been persisted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Conversation</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Speech</th>
                  <th className="px-4 py-3">TTS</th>
                  <th className="px-4 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id ?? snapshot.conversation_id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-900">{snapshot.conversation_id}</td>
                    <td className="px-4 py-3 text-slate-600">{formatPercent(snapshot.facilitation_health_score)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatPercent(snapshot.participant_balance)}</td>
                    <td className="px-4 py-3 text-slate-600">{snapshot.speech_turn_count}</td>
                    <td className="px-4 py-3 text-slate-600">{snapshot.tts_event_count}</td>
                    <td className="px-4 py-3 text-slate-500">{snapshot.updated_at ? new Date(snapshot.updated_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
