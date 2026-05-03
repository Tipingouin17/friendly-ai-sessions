/**
 * InactivityAlert
 *
 * Indicative banner shown in the Host view when participants have not all
 * responded within the configured inactivity threshold (default: 3 min).
 *
 * This is purely informational — it never triggers any automatic action.
 * The Host decides whether to wait longer or advance the session manually.
 */

import React from 'react';
import { Clock, X, Users } from 'lucide-react';

interface InactivityAlertProps {
  /** Seconds elapsed since the last AI message */
  elapsedSeconds: number;
  /** Number of participants who have NOT yet responded */
  pendingCount: number;
  /** Total active participants */
  totalParticipants: number;
  /** Called when the host dismisses the alert */
  onDismiss: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

const InactivityAlert: React.FC<InactivityAlertProps> = ({
  elapsedSeconds,
  pendingCount,
  totalParticipants,
  onDismiss,
}) => {
  return (
    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 shadow-sm">
      {/* Icon */}
      <div className="shrink-0 mt-0.5 p-1.5 bg-amber-100 rounded-lg">
        <Clock className="h-4 w-4 text-amber-600" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900 leading-tight">
          Waiting for {pendingCount} participant{pendingCount > 1 ? 's' : ''}
        </p>
        <p className="text-xs text-amber-700 mt-0.5">
          No new response for{' '}
          <span className="font-medium">{formatDuration(elapsedSeconds)}</span>.{' '}
          {totalParticipants - pendingCount} of {totalParticipants} have responded.
        </p>
        <p className="text-xs text-amber-600 mt-1 italic">
          You can continue the session at any time using the button below.
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-amber-100 transition-colors"
        aria-label="Dismiss inactivity alert"
      >
        <X className="h-4 w-4 text-amber-500" />
      </button>
    </div>
  );
};

export default InactivityAlert;
