
import React from 'react';

const JoinSessionLoadingState: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-t-2 border-purple-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading session information...</p>
      </div>
    </div>
  );
};

export default JoinSessionLoadingState;
