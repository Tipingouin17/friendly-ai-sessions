
import React from 'react';

const AdminMessageLoadingState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-6"></div>
        <h3 className="mb-3 text-xl font-medium text-gray-800">Loading session data...</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Please wait while we fetch the session information.
        </p>
      </div>
    </div>
  );
};

export default AdminMessageLoadingState;
