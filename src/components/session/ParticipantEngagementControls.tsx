/**
 * ParticipantEngagementControls — Responsive redesign
 *
 * - No isMobile branching — pure CSS responsive
 * - Consistent pill-style action buttons
 * - Clean status banners for paused/skipped states
 * - Inline host message composer
 */

import React, { useState } from 'react';
import { SkipForward, PauseCircle, PlayCircle, MessageSquareDot, Send, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EngagementStatus } from '@/hooks/useParticipantEngagement';

interface ParticipantEngagementControlsProps {
  status: EngagementStatus;
  onSkip: () => void;
  onTogglePause: () => void;
  onSendHostMessage: (message: string) => Promise<void>;
  isSendingHostMessage: boolean;
  hostMessageSent: boolean;
  hasAnswered?: boolean;
  isMobile?: boolean; // kept for API compat
}

const ParticipantEngagementControls: React.FC<ParticipantEngagementControlsProps> = ({
  status,
  onSkip,
  onTogglePause,
  onSendHostMessage,
  isSendingHostMessage,
  hostMessageSent,
  hasAnswered = false,
}) => {
  const [showHostComposer, setShowHostComposer] = useState(false);
  const [hostMessage, setHostMessage] = useState('');

  const isPaused = status === 'paused';
  const isSkipped = status === 'skipped';

  const handleSendHostMessage = async () => {
    if (!hostMessage.trim()) return;
    await onSendHostMessage(hostMessage);
    setHostMessage('');
    setShowHostComposer(false);
  };

  return (
    <div className="w-full border-t border-slate-100 bg-white">

      {/* ── Paused banner ──────────────────────────────────────────────────── */}
      {isPaused && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200">
          <PauseCircle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="flex-1 text-sm text-amber-700">
            You're on a break — the facilitator won't wait for your response.
          </p>
          <button
            onClick={onTogglePause}
            className="shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
          >
            Resume
          </button>
        </div>
      )}

      {/* ── Skipped banner ─────────────────────────────────────────────────── */}
      {isSkipped && !isPaused && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <SkipForward className="h-4 w-4 text-slate-400 shrink-0" />
          <p className="flex-1 text-sm text-slate-500">
            You skipped this question — waiting for the facilitator's next message…
          </p>
          {/* Animated dots to signal the facilitator is about to respond */}
          <span className="flex items-center gap-1 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '160ms', animationDuration: '1s' }} />
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '320ms', animationDuration: '1s' }} />
          </span>
        </div>
      )}

      {/* ── Host message sent confirmation ─────────────────────────────────── */}
      {hostMessageSent && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border-b border-emerald-200">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <span className="text-xs text-emerald-700 font-medium">Message sent to host</span>
        </div>
      )}

      {/* ── Host message composer ───────────────────────────────────────────── */}
      {showHostComposer && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border-b border-blue-200">
          <input
            type="text"
            value={hostMessage}
            onChange={e => setHostMessage(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendHostMessage(); }
              if (e.key === 'Escape') { setShowHostComposer(false); setHostMessage(''); }
            }}
            placeholder="Private message to host…"
            autoFocus
            className="flex-1 text-sm bg-white border border-blue-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-300"
          />
          <button
            onClick={handleSendHostMessage}
            disabled={!hostMessage.trim() || isSendingHostMessage}
            className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setShowHostComposer(false); setHostMessage(''); }}
            className="h-9 w-9 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center hover:bg-blue-200 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-1 px-2 py-1.5 sm:px-3 sm:py-2">

        {/* Skip */}
        {!hasAnswered && !isSkipped && !isPaused && (
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:px-3"
          >
            <SkipForward className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">Skip question</span>
            <span className="xs:hidden">Skip</span>
          </button>
        )}

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
            isPaused
              ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          {isPaused
            ? <><PlayCircle className="h-3.5 w-3.5" /><span className="hidden xs:inline">Resume session</span><span className="xs:hidden">Resume</span></>
            : <><PauseCircle className="h-3.5 w-3.5" /><span className="hidden xs:inline">Take a break</span><span className="xs:hidden">Pause</span></>
          }
        </button>

        {/* Message host */}
        <button
          onClick={() => setShowHostComposer(v => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3",
            showHostComposer
              ? "text-blue-600 bg-blue-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          <MessageSquareDot className="h-3.5 w-3.5" />
          <span className="hidden xs:inline">Message host</span>
          <span className="xs:hidden">Host</span>
        </button>
      </div>
    </div>
  );
};

export default ParticipantEngagementControls;
