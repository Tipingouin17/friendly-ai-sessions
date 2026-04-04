/**
 * WaitingForResponsesIndicator — Redesigned
 *
 * Clean progress bar showing how many participants have responded.
 */

import React from 'react';
import { Users } from 'lucide-react';

interface WaitingForResponsesIndicatorProps {
  currentResponses: number;
  totalParticipants: number;
  isMobile?: boolean; // kept for API compat
}

const WaitingForResponsesIndicator: React.FC<WaitingForResponsesIndicatorProps> = ({
  currentResponses,
  totalParticipants,
}) => {
  const pct = totalParticipants > 0
    ? Math.round((currentResponses / totalParticipants) * 100)
    : 0;

  return (
    <div className="flex justify-center my-2">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-3 space-y-2.5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <span className="text-xs font-semibold text-slate-700">Collecting responses</span>
          </div>
          <span className="text-xs font-semibold text-indigo-600">{currentResponses}/{totalParticipants}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-slate-400 text-center">
          Waiting for all participants before the facilitator continues…
        </p>
      </div>
    </div>
  );
};

export default WaitingForResponsesIndicator;
