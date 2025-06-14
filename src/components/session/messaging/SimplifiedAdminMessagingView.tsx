
import React from 'react';
import { Message } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import { MessagesSquare } from 'lucide-react';

interface SimplifiedAdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData?: any; // Added to pass facilitator info
}

const SimplifiedAdminMessagingView: React.FC<SimplifiedAdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  conversationData
}) => {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <div className="mb-3 p-3 bg-gray-50 rounded-full">
          <MessagesSquare className="w-6 h-6 text-gray-400" />
        </div>
        <p className="text-base font-medium mb-1">Admin Monitoring</p>
        <p className="text-sm">
          All participant messages will appear here as they are sent.
        </p>
        <div className="mt-2 text-xs text-gray-400">
          Current participants: {currentParticipantCount}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <MessageList 
        messages={messages}
        participantColors={participantColors}
        isWaitingForResponse={false}
        participants={[]}
        isMobile={false}
        conversationData={conversationData}
      />
    </div>
  );
};

export default SimplifiedAdminMessagingView;
