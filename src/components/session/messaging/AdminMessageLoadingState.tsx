
import React from 'react';

const AdminMessageLoadingState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-t-2 border-b-2 border-amber-500 rounded-full animate-spin mx-auto mb-4"></div>
        <h3 className="mb-2 text-xl font-medium">Loading session data...</h3>
        <p className="text-gray-500">
          Please wait while we fetch the session information.
        </p>
      </div>
    </div>
  );
};

export default AdminMessageLoadingState;
