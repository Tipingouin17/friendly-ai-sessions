
import React from 'react';

const LoadingState = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-12 h-12 border-t-2 border-b-2 border-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Loading Session</h2>
        <p className="text-gray-600">Please wait while we prepare your session...</p>
      </div>
    </div>
  );
};

export default LoadingState;
