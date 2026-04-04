/**
 * ParticipantMessagingView — World-class responsive redesign
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  Session header bar (sticky)        │
 *   ├─────────────────────────────────────┤
 *   │  Message list (flex-1, scrollable)  │
 *   ├─────────────────────────────────────┤
 *   │  Engagement controls                │
 *   │  Chat input                         │
 *   └─────────────────────────────────────┘
 *
 * - No separate mobile/desktop layouts — one unified responsive design
 * - The message area fills all available space and scrolls independently
 * - The input footer is always visible at the bottom (sticky)
 * - Session info accessible via a compact top bar (no sidebar)
 */

import React from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';
import { Users, Home, Sparkles } from 'lucide-react';

interface ParticipantMessagingViewProps {
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  isWaitingForResponse?: boolean;
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  participants: ParticipantInfo[];
  conversationId: number | null;
  currentParticipantCount: number;
  maxParticipants: number;
  isMobile: boolean;
  conversationData?: any;
  inputMessage?: string;
  setInputMessage?: (message: string) => void;
  onSendMessage?: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  isAnonymous?: boolean;
  toggleAnonymous?: () => void;
  hasAnswered?: boolean;
  totalResponses?: number;
  viewMode?: "participant" | "admin";
  participantNames?: { [key: number]: string };
  currentUserParticipantId?: number | null;
  showResponseStats?: boolean;
}

const ParticipantMessagingView: React.FC<ParticipantMessagingViewProps> = ({
  messages,
  participantColors,
  currentParticipant,
  isWaitingForResponse = false,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  participants,
  conversationId,
  currentParticipantCount = 0,
  maxParticipants = 1,
  conversationData,
  inputMessage = '',
  setInputMessage = () => { /* no-op */ },
  onSendMessage = () => { /* no-op */ },
  isRecording = false,
  setIsRecording = () => { /* no-op */ },
  isAnonymous = false,
  toggleAnonymous = () => { /* no-op */ },
  hasAnswered = false,
  totalResponses = 0,
  viewMode = "participant",
  participantNames = {},
  currentUserParticipantId = null,
  showResponseStats = false,
}) => {
  const isSessionEnded = conversationData?.is_session_ended || conversationData?.status === 'completed';
  const effectiveParticipantId = currentUserParticipantId !== null ? currentUserParticipantId : currentParticipant;

  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant",
    participants,
    participantNames,
    currentParticipant: effectiveParticipantId
  });

  const sessionTitle = conversationData?.sessions?.title || 'Session';
  const facilitatorTitle = conversationData?.sessions?.facilitator_details?.title;

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Session info bar (sticky top) ──────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        {/* Facilitator avatar / icon */}
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>

        {/* Title + facilitator */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{sessionTitle}</p>
          {facilitatorTitle && (
            <p className="text-xs text-slate-400 truncate">Facilitated by {facilitatorTitle}</p>
          )}
        </div>

        {/* Participant count */}
        <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 rounded-full px-2.5 py-1">
          <Users className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-medium text-slate-600">
            {currentParticipantCount}/{maxParticipants}
          </span>
        </div>
      </div>

      {/* ── Message list (flex-1 = fills all remaining space, scrolls) ─── */}
      <div className="flex-1 min-h-0">
        <MessageList
          messages={filteredMessages}
          participantColors={participantColors}
          currentParticipant={String(effectiveParticipantId)}
          isWaitingForResponse={isWaitingForResponse}
          isWaitingForResponses={isWaitingForResponses}
          responseCount={responseCount}
          totalParticipants={totalParticipants}
          participants={participants}
          conversationData={conversationData}
        />
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      {isSessionEnded ? (
        /* Session ended banner */
        <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">This session has ended</p>
              <p className="text-xs text-amber-600">Thank you for your participation!</p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="shrink-0 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
          >
            <Home className="h-4 w-4" />
            Return Home
          </button>
        </div>
      ) : (
        /* Active input footer */
        <div className="shrink-0">
          <InputFooter
            participantCount={maxParticipants}
            currentParticipant={effectiveParticipantId}
            participantNames={participantNames}
            participants={participants}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            currentUserParticipantId={effectiveParticipantId}
            isAnonymous={isAnonymous}
            toggleAnonymous={toggleAnonymous}
            hasAnswered={hasAnswered}
            totalResponses={totalResponses}
            viewMode={viewMode}
            messages={messages}
            showResponseStats={showResponseStats}
            conversationId={conversationId}
          />
        </div>
      )}
    </div>
  );
};

export default ParticipantMessagingView;
