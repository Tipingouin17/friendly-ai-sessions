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
import type { ConversationWithSession } from '@/types/database';
import type { UseStreamingFacilitatorRuntimeResult } from '@/hooks/facilitator/useStreamingFacilitatorRuntime';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';
import { Users, Home, Sparkles } from 'lucide-react';
import FacilitatorAvatar from '@/components/chat/avatars/FacilitatorAvatar';
import type { FacilitatorToolAssignment } from '@/types/facilitator';
import { recordSpeechTurn } from '@/services/facilitator/phase3RuntimeService';
import { useFacilitatorVoice } from '@/hooks/facilitator/useFacilitatorVoice';
import type { FacilitatorModeAssignment, ModeInput, ModeParticipantState, SessionActiveMode, SessionModeEvent } from '@/services/modeOrchestratorService';

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
  conversationData?: ConversationWithSession | null;
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
  facilitatorRuntime?: UseStreamingFacilitatorRuntimeResult;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  participantModeState?: ModeParticipantState | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  submitModeInput?: (params: {
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => Promise<unknown>;
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
  facilitatorRuntime,
  enabledTools = [],
  isLoadingToolbox = false,
  enabledModes = [],
  activeMode = null,
  participantModeState = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  submitModeInput,
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
  const facilitatorName = facilitatorTitle || 'Facilitator';
  const facilitatorAvatarUrl = conversationData?.sessions?.facilitator_details?.profile_picture || null;
  const facilitatorDetails = conversationData?.sessions?.facilitator_details as { id?: number; title?: string; profile_picture?: string | null } | undefined;
  const facilitatorId = facilitatorDetails?.id ?? null;
  const voiceRuntime = useFacilitatorVoice({
    conversationId,
    facilitatorId,
    enabled: viewMode === 'participant',
    persistEvents: true,
  });
  const runtimeAvatarState = voiceRuntime.isSpeaking
    ? voiceRuntime.runtimeAvatarState
    : facilitatorRuntime?.avatarState ?? null;
  const showRuntimeAvatarState = Boolean((facilitatorRuntime?.enabled && runtimeAvatarState) || voiceRuntime.isSpeaking);

  const lastSpokenAssistantMessageRef = React.useRef<string | null>(null);
  const lastAssistantMessage = React.useMemo(() => {
    return [...messages].reverse().find((message) => message.sender === 'assistant') ?? null;
  }, [messages]);

  React.useEffect(() => {
    if (!lastAssistantMessage || !conversationId) return;
    if (lastSpokenAssistantMessageRef.current === lastAssistantMessage.id) return;
    lastSpokenAssistantMessageRef.current = lastAssistantMessage.id;
    void voiceRuntime.speak({
      text: lastAssistantMessage.content,
      messageId: lastAssistantMessage.id,
      metadata: { source: 'participant_messaging_view' },
    });
  }, [conversationId, lastAssistantMessage, voiceRuntime]);

  const handleSpeechInterim = React.useCallback((payload: { transcript: string; confidence: number | null }) => {
    facilitatorRuntime?.pushStreamChunk({
      modality: 'speech',
      status: 'partial',
      text: payload.transcript,
      confidence: payload.confidence ?? undefined,
    });
  }, [facilitatorRuntime]);

  const handleSpeechFinal = React.useCallback((payload: { transcript: string; confidence: number | null; startedAt: string | null; endedAt: string; durationMs: number | null }) => {
    if (!conversationId) return;
    facilitatorRuntime?.pushStreamChunk({
      modality: 'speech',
      status: 'final',
      text: payload.transcript,
      confidence: payload.confidence ?? undefined,
    });
    void recordSpeechTurn({
      conversationId,
      facilitatorId,
      participantId: effectiveParticipantId,
      speakerRole: 'participant',
      transcript: payload.transcript,
      confidence: payload.confidence,
      language: conversationData?.language || 'en-US',
      source: 'browser_speech_recognition',
      durationMs: payload.durationMs,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      metrics: { composer: 'participant_chat_input' },
    });
  }, [conversationData?.language, conversationId, effectiveParticipantId, facilitatorId, facilitatorRuntime]);

  return (
    <div className="flex flex-col h-full bg-slate-50">

      {/* ── Session info bar (sticky top) ──────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        {/* Facilitator avatar / icon */}
        {showRuntimeAvatarState ? (
          <FacilitatorAvatar
            avatarUrl={facilitatorAvatarUrl}
            name={facilitatorName}
            size="md"
            runtimeState={runtimeAvatarState}
            enableRuntimeAnimation
          />
        ) : (
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Title + facilitator */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate leading-tight">{sessionTitle}</p>
          {facilitatorTitle && (
            <p className="text-xs text-slate-400 truncate">Facilitated by {facilitatorTitle}</p>
          )}
              {showRuntimeAvatarState && (
                <p className="text-[11px] text-indigo-500 truncate capitalize" aria-live="polite">
                  {voiceRuntime.isSpeaking
                    ? 'AI facilitator is speaking'
                    : runtimeAvatarState?.reason || 'AI facilitator is monitoring the discussion'}
                </p>
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
            enabledTools={enabledTools}
            isLoadingToolbox={isLoadingToolbox}
            enabledModes={enabledModes}
            activeMode={activeMode}
            participantModeState={participantModeState}
            recentModeEvents={recentModeEvents}
            isLoadingModes={isLoadingModes}
            modeError={modeError}
            submitModeInput={submitModeInput}
            speechLanguage={conversationData?.language || 'en-US'}
            onSpeechInterim={handleSpeechInterim}
            onSpeechFinal={handleSpeechFinal}
          />
        </div>
      )}
    </div>
  );
};

export default ParticipantMessagingView;
