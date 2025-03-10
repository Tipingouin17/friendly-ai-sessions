
import React from 'react';

const AdminMessageLoadingState: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h3 className="mb-2 text-xl font-medium">Loading session data...</h3>
        <p className="text-gray-500">
          Please wait while we fetch the session information.
        </p>
      </div>
    </div>
  );
};

export default AdminMessageLoadingState;
