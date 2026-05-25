/**
 * Input Footer
 *
 * Session component for the AIfacilitator application.
 * Includes participant engagement controls (skip, pause, message host).
 */

import { createLogger } from '@/utils/debugLogger';

const log = createLogger('InputFooter', 'session');

import React from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { Message, ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import { Lock, Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import ParticipantEngagementControls from './ParticipantEngagementControls';
import { useParticipantEngagement } from '@/hooks/useParticipantEngagement';

interface InputFooterProps {
  participantCount: number;
  currentParticipant: number;
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
  currentUserParticipantId?: number | null;
  isAnonymous: boolean;
  toggleAnonymous: () => void;
  hasAnswered: boolean;
  totalResponses: number;
  viewMode: "participant" | "admin";
  messages?: Message[];
  showResponseStats?: boolean;
  conversationId?: number | null;
  onParticipantStatusChange?: (participantId: number, status: 'active' | 'paused' | 'skipped') => void;
  speechEnabled?: boolean;
  speechLanguage?: string;
  onSpeechInterim?: (payload: { transcript: string; confidence: number | null }) => void;
  onSpeechFinal?: (payload: { transcript: string; confidence: number | null; startedAt: string | null; endedAt: string; durationMs: number | null }) => void;
  placeholder?: string;
  disabled?: boolean;
}

const InputFooter = ({
  participantCount,
  currentParticipant,
  participantNames,
  participants,
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording,
  currentUserParticipantId,
  isAnonymous,
  toggleAnonymous,
  hasAnswered,
  totalResponses,
  viewMode,
  messages = [],
  showResponseStats = false,
  conversationId = null,
  onParticipantStatusChange,
  speechEnabled = true,
  speechLanguage = 'en-US',
  onSpeechInterim,
  onSpeechFinal,
  placeholder = "Type your response…",
  disabled = false,
}: InputFooterProps) => {
  const isMobile = useIsMobile();
  const { maxQuestionsPerSession } = usePlanLimits();

  // Find current participant info
  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name ||
    participantNames[currentParticipant] ||
    `Participant ${currentParticipant}`;

  // Engagement controls
  const {
    status,
    isPaused,
    isSkipped,
    skipQuestion,
    resetSkip,
    togglePause,
    sendMessageToHost,
    isSendingHostMessage,
    hostMessageSent,
  } = useParticipantEngagement({
    conversationId,
    participantId: currentUserParticipantId ?? currentParticipant,
    participantName,
  });

  // Notify parent when status changes (so response counting can exclude paused/skipped)
  const effectiveParticipantId = currentUserParticipantId ?? currentParticipant;
  React.useEffect(() => {
    onParticipantStatusChange?.(effectiveParticipantId, status);
  }, [status, effectiveParticipantId, onParticipantStatusChange]);

  // Reset skip when a new facilitator message arrives
  const lastAssistantMessageId = React.useMemo(() => {
    const assistantMessages = messages.filter(m => m.sender === 'assistant');
    return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].id : null;
  }, [messages]);
  React.useEffect(() => {
    resetSkip();
  }, [lastAssistantMessageId, resetSkip]);

  // Safely determine if this is a new session with just a welcome message
  const isNewSession = Array.isArray(messages) && messages.length <= 1 &&
    messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');

  // Check if the most recent message is from the facilitator
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const shouldAllowAnswer = (lastMessage?.sender === 'assistant' || isNewSession || !hasAnswered)
    && !isPaused
    && !isSkipped
    && !disabled;

  // Count how many questions this participant has sent
  const participantKey = String(effectiveParticipantId);
  const userMessageCount = Array.isArray(messages)
    ? messages.filter(m => m.sender === 'user' && m.participant === participantKey).length
    : 0;
  const hasReachedQuestionLimit = maxQuestionsPerSession !== Infinity && userMessageCount >= maxQuestionsPerSession;


  // Enhanced participant detection logic
  const urlParams = new URLSearchParams(window.location.search);
  const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');
  const isParticipantContext = hasParticipantParams || viewMode === "participant";

  // Don't show input for pure admin view (without participant context)
  if (viewMode === "admin" && !isParticipantContext) {
    return null;
  }

  return (
    <>
      {showResponseStats && (
        <div className="px-2 py-1 border-t border-gray-100 bg-white">
          <Badge variant="outline" className="bg-gray-50 text-xs px-1.5 py-0.5">
            <Users className="w-3 h-3 mr-1" />
            <span>{totalResponses} of {participantCount} answered</span>
          </Badge>
        </div>
      )}

      <div className="w-full border-t border-gray-100 bg-white/90 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {/* Question limit reached */}
        {isParticipantContext && hasReachedQuestionLimit ? (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="mb-2 flex items-center justify-center gap-2 bg-amber-50 px-3 py-2 rounded-md text-amber-700 border border-amber-200 w-full text-sm">
              <Lock className="h-4 w-4" />
              <span className="font-medium">
                Question limit reached ({maxQuestionsPerSession} per session).{" "}
                <a href="/pricing" className="underline hover:text-amber-900">Upgrade your plan</a> for more.
              </span>
            </div>
          </div>
        ) : isParticipantContext ? (
          <>
            {/* Engagement controls: skip / pause / message host */}
            <ParticipantEngagementControls
              status={status}
              onSkip={skipQuestion}
              onTogglePause={togglePause}
              onSendHostMessage={sendMessageToHost}
              isSendingHostMessage={isSendingHostMessage}
              hostMessageSent={hostMessageSent}
              hasAnswered={hasAnswered}
              isMobile={isMobile}
            />

            {/* Chat input — hidden when paused or skipped */}
            {!isPaused && !isSkipped && (
              <ChatInput
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={onSendMessage}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                placeholder={placeholder}
                disabled={!shouldAllowAnswer}
                isMobile={isMobile}
                speechEnabled={speechEnabled}
                speechLanguage={speechLanguage}
                onSpeechInterim={onSpeechInterim}
                onSpeechFinal={onSpeechFinal}
              />
            )}
          </>
        ) : (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center">
            <div className="mb-2 flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-md text-green-700 border border-green-200 w-full text-sm">
              <span className="font-medium">Your answer has been submitted</span>
            </div>
            <p className="text-xs text-gray-500">
              Waiting for other participants to respond…
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
