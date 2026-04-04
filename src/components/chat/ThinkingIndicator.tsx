/**
 * ThinkingIndicator — Redesigned
 *
 * Clean animated dots with facilitator label.
 */

import React from 'react';
import { Sparkles } from 'lucide-react';

const ThinkingIndicator = () => {
  return (
    <div className="flex items-end gap-2 justify-start">
      {/* Avatar placeholder */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
        <Sparkles className="h-4 w-4 text-white" />
      </div>

      {/* Bubble */}
      <div className="rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: '0ms', animationDuration: '1s' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: '160ms', animationDuration: '1s' }}
          />
          <span
            className="h-2 w-2 rounded-full bg-indigo-400 animate-bounce"
            style={{ animationDelay: '320ms', animationDuration: '1s' }}
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">Facilitator is thinking…</span>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
