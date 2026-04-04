/**
 * ParticipantEngagementControls
 *
 * Renders three action buttons above the participant chat input:
 *   - Skip question
 *   - Pause / Resume
 *   - Message host (expands an inline composer)
 *
 * Also shows status banners when the participant is paused or has skipped.
 */

import React, { useState } from 'react';
import { SkipForward, PauseCircle, PlayCircle, MessageSquareDot, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EngagementStatus } from '@/hooks/useParticipantEngagement';

interface ParticipantEngagementControlsProps {
  status: EngagementStatus;
  onSkip: () => void;
  onTogglePause: () => void;
  onSendHostMessage: (message: string) => Promise<void>;
  isSendingHostMessage: boolean;
  hostMessageSent: boolean;
  /** Hide skip button when participant has already answered the current question */
  hasAnswered?: boolean;
  isMobile?: boolean;
}

const ParticipantEngagementControls: React.FC<ParticipantEngagementControlsProps> = ({
  status,
  onSkip,
  onTogglePause,
  onSendHostMessage,
  isSendingHostMessage,
  hostMessageSent,
  hasAnswered = false,
  isMobile = false,
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
    <div className="w-full">
      {/* ── Status banners ─────────────────────────────────────────────── */}
      {isPaused && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-t border-amber-200 text-amber-700 text-sm">
          <PauseCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">You are on a break — the facilitator won't wait for your response.</span>
          <button
            onClick={onTogglePause}
            className="text-xs font-semibold underline hover:text-amber-900"
          >
            Resume
          </button>
        </div>
      )}
      {isSkipped && !isPaused && (
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-t border-slate-200 text-slate-600 text-sm">
          <SkipForward className="h-4 w-4 shrink-0" />
          <span className="flex-1">You skipped this question — the session will continue without your response.</span>
        </div>
      )}

      {/* ── Host message composer ───────────────────────────────────────── */}
      {showHostComposer && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border-t border-blue-200">
          <input
            type="text"
            value={hostMessage}
            onChange={e => setHostMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendHostMessage(); } }}
            placeholder="Private message to host…"
            className="flex-1 text-sm bg-white border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 placeholder:text-blue-300"
            autoFocus
          />
          <button
            onClick={handleSendHostMessage}
            disabled={!hostMessage.trim() || isSendingHostMessage}
            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { setShowHostComposer(false); setHostMessage(''); }}
            className="text-xs text-blue-500 hover:text-blue-700 px-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Host message sent confirmation ─────────────────────────────── */}
      {hostMessageSent && (
        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 border-t border-green-200 text-green-700 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Message sent to host
        </div>
      )}

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center gap-1 px-3 py-1.5 border-t border-gray-100 bg-white/80",
          isMobile ? "justify-between" : "justify-end"
        )}
      >
        {/* Skip */}
        {!hasAnswered && !isSkipped && !isPaused && (
          <button
            onClick={onSkip}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors",
              "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <SkipForward className="h-3.5 w-3.5" />
            {isMobile ? 'Skip' : 'Skip question'}
          </button>
        )}

        {/* Pause / Resume */}
        <button
          onClick={onTogglePause}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors",
            isPaused
              ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          {isPaused
            ? <><PlayCircle className="h-3.5 w-3.5" />{isMobile ? 'Resume' : 'Resume session'}</>
            : <><PauseCircle className="h-3.5 w-3.5" />{isMobile ? 'Pause' : 'Take a break'}</>
          }
        </button>

        {/* Message host */}
        <button
          onClick={() => setShowHostComposer(v => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs font-medium rounded-full px-3 py-1 transition-colors",
            showHostComposer
              ? "text-blue-600 bg-blue-50"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
          )}
        >
          <MessageSquareDot className="h-3.5 w-3.5" />
          {isMobile ? 'Host' : 'Message host'}
        </button>
      </div>
    </div>
  );
};

export default ParticipantEngagementControls;
