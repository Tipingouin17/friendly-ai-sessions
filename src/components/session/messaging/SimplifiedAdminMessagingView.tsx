
import React from 'react';
import { Message } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import { MessagesSquare, Users, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StartSessionButton from '@/components/session/admin/StartSessionButton';

interface SimplifiedAdminMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipantCount: number;
  conversationData?: any;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: () => void;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  participants?: any[];
  conversationId?: number | null;
}

const SimplifiedAdminMessagingView: React.FC<SimplifiedAdminMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipantCount,
  conversationData,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  isSessionStarted = false,
  onSessionStarted,
  participants = [],
  conversationId
}) => {
  console.log('SimplifiedAdminMessagingView: Rendering with', messages.length, 'messages and', currentParticipantCount, 'participants');
  console.log('Session started:', isSessionStarted);
  console.log('Participants prop:', participants?.length);

  // Show empty state if no real messages exist OR session hasn't started
  // Filter out welcome messages to check for real participant/facilitator content
  const realMessages = messages.filter(msg => !msg.isWelcomeMessage);
  const shouldShowEmptyState = realMessages.length === 0;

  if (shouldShowEmptyState) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
        <div className="mb-3 p-3 bg-gray-50 rounded-full">
          <MessagesSquare className="w-6 h-6 text-gray-400" />
        </div>
        
        {!isSessionStarted ? (
          <>
            <p className="text-base font-medium mb-1">Ready to Start Session</p>
            <p className="text-sm mb-4">
              Click the button below to begin the session and send the welcome message to participants.
            </p>
            <div className="mt-4 mb-6">
              <StartSessionButton
                conversationId={conversationId}
                participants={participants}
                conversationData={conversationData}
                onSessionStarted={onSessionStarted || (() => {})}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-base font-medium mb-1">Session Active - Monitoring</p>
            <p className="text-sm">
              All participant messages will appear here as they are sent.
            </p>
          </>
        )}
        
        <div className="mt-2 text-xs text-gray-400">
          Current participants: {currentParticipantCount}
        </div>
        
        {conversationData?.sessions?.welcome_message && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700 mb-1 font-medium">Session Welcome Message:</p>
            <p className="text-xs text-blue-600">{conversationData.sessions.welcome_message}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Response Collection Status Banner */}
      {isWaitingForResponses && totalParticipants > 1 && (
        <div className="bg-orange-50 border-b border-orange-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-800">
                Waiting for participant responses
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-xs text-orange-600">
                <Users className="w-3 h-3" />
                <span>{responseCount} of {totalParticipants} responded</span>
              </div>
              {onTriggerFacilitatorResponse && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTriggerFacilitatorResponse}
                  className="text-xs h-7"
                >
                  Continue Anyway
                </Button>
              )}
            </div>
          </div>
          {totalParticipants > 1 && (
            <div className="mt-2 w-full bg-orange-200 rounded-full h-1">
              <div 
                className="bg-orange-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${(responseCount / totalParticipants) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages}
          participantColors={participantColors}
          isWaitingForResponse={false}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          participants={[]}
          isMobile={false}
          conversationData={conversationData}
        />
      </div>
    </div>
  );
};

export default SimplifiedAdminMessagingView;
