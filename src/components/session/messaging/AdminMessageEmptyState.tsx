
import React from 'react';
import { MessageSquare } from 'lucide-react';

interface AdminMessageEmptyStateProps {
  conversationData: any;
}

const AdminMessageEmptyState: React.FC<AdminMessageEmptyStateProps> = ({ conversationData }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="mb-3 text-xl font-medium text-gray-800">No messages yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          {conversationData?.session_started 
            ? "The session has started. Messages will appear here as participants engage."
            : "The session hasn't started yet. Messages will appear here once the session begins."}
        </p>
      </div>
    </div>
  );
};

export default AdminMessageEmptyState;
