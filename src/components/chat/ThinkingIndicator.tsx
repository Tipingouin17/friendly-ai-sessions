
import React from 'react';
import { Bot } from 'lucide-react';

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start mt-2">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm bg-indigo-50 border border-indigo-200">
        <div className="flex items-center gap-2">
          <Bot className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <span className="text-xs text-indigo-600 font-medium ml-1">Facilitator is thinking…</span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
