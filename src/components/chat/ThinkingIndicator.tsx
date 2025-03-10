
import React from 'react';

const ThinkingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-white text-gray-800 rounded-tl-none border border-gray-100 mt-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-150"></div>
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse delay-300"></div>
          <span className="text-sm text-gray-500 ml-1">Facilitator is thinking...</span>
        </div>
      </div>
    </div>
  );
};

export default ThinkingIndicator;
