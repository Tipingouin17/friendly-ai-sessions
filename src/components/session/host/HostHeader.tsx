
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, QrCode, Square } from "lucide-react";
import SessionsDropdown from "./SessionsDropdown";
import StartSessionButton from "./StartSessionButton";

interface HostHeaderProps {
  currentConversationId: number | null;
  conversation: any;
  sessions: any[];
  participants: any[];
  isLoadingParticipants: boolean;
  onShowQrCode: () => void;
  onWrapUpSession: () => void;
  isSessionStarted: boolean;
  onSessionStarted: () => void;
  triggerSessionStart?: () => Promise<boolean>;
  sessionStartNotification?: string | null;
  isStartingSession?: boolean;
  startProgress?: string;
}

const HostHeader: React.FC<HostHeaderProps> = ({
  currentConversationId,
  conversation,
  sessions,
  participants,
  isLoadingParticipants,
  onShowQrCode,
  onWrapUpSession,
  isSessionStarted,
  onSessionStarted,
  triggerSessionStart,
  sessionStartNotification,
  isStartingSession = false,
  startProgress = ''
}) => {
  const navigate = useNavigate();

  const facilitatorTitle = conversation?.sessions?.facilitator_details?.title || 'Facilitator';
  const sessionTitle = conversation?.sessions?.title || 'Session';

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col space-y-4">
        {/* Top row - Back button and session info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/my-facilitators')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Facilitators
            </Button>

            <div className="hidden sm:block h-6 w-px bg-gray-300" />

            <div className="flex items-center space-x-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {isLoadingParticipants ? 'Loading...' : `${participants.length} participants`}
                </span>
              </div>

              <SessionsDropdown 
                sessions={sessions}
                currentConversationId={currentConversationId}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onShowQrCode}
              className="flex items-center gap-2"
            >
              <QrCode className="h-4 w-4" />
              Show QR
            </Button>

            {isSessionStarted && (
              <Button
                variant="outline"
                size="sm"
                onClick={onWrapUpSession}
                className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <Square className="h-4 w-4" />
                End Session
              </Button>
            )}
          </div>
        </div>

        {/* Second row - Session details and start button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{sessionTitle}</h1>
            <p className="text-sm text-gray-600">with {facilitatorTitle}</p>
          </div>

          <div className="flex items-center space-x-3">
            {sessionStartNotification && !isSessionStarted && (
              <div className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded border border-blue-200">
                {sessionStartNotification}
              </div>
            )}

            <StartSessionButton
              onStartSession={onSessionStarted}
              participantCount={participants.length}
              isSessionStarted={isSessionStarted}
              disabled={isLoadingParticipants}
              isStartingSession={isStartingSession}
              startProgress={startProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostHeader;
