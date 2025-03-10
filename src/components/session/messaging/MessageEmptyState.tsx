
import React from 'react';
import { Button } from '@/components/ui/button';
import { MessagesSquare, Share2, Users } from 'lucide-react';

interface MessageEmptyStateProps {
  isAdmin?: boolean;
  messagesLength: number;
  viewMode: "participant" | "admin";
}

const MessageEmptyState: React.FC<MessageEmptyStateProps> = ({ 
  isAdmin = false, 
  messagesLength, 
  viewMode 
}) => {
  if (viewMode === "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
        <div className="mb-4 p-4 bg-gray-50 rounded-full">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium mb-2">No messages yet</p>
        <p className="max-w-md">
          {messagesLength > 0 ? 
            "No matching responses found. Try changing your filters." :
            "Share the QR code with participants to begin the session."}
        </p>
        
        <div className="mt-6 flex gap-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.navigator.clipboard.writeText(window.location.href)}
          >
            <Share2 className="w-4 h-4" /> Copy session link
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
      <div className="mb-4 p-4 bg-gray-50 rounded-full">
        <MessagesSquare className="w-8 h-8 text-gray-400" />
      </div>
      <p className="text-lg font-medium mb-2">No messages yet</p>
      <p className="max-w-md text-sm">
        When the session begins, messages will appear here.
      </p>
    </div>
  );
};

export default MessageEmptyState;
