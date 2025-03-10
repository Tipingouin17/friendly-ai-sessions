
import React from 'react';

interface AdminMessageEmptyStateProps {
  conversationData: any;
}

const AdminMessageEmptyState: React.FC<AdminMessageEmptyStateProps> = ({
  conversationData
}) => {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h3 className="mb-2 text-xl font-medium">Waiting for session data...</h3>
        <p className="text-gray-500">
          No messages yet. The session may not have started.
        </p>
        <p className="text-gray-500 mt-2">
          Session: {conversationData?.sessions?.title || "Unknown"}
        </p>
        <p className="text-gray-500">
          Facilitator: {conversationData?.sessions?.facilitator_details?.title || "Unknown"}
        </p>
      </div>
    </div>
  );
};

export default AdminMessageEmptyState;
