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

import React, { useState } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import MessageList from '@/components/chat/MessageList';
import InputFooter from '@/components/session/InputFooter';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';
import { Camera, CameraOff, Captions, Headphones, Home, Mic, MonitorPlay, PenLine, Radio, ShieldCheck, Sparkles, Users, Video, Volume2 } from 'lucide-react';

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
  const sessionObjective = conversationData?.sessions?.objective || conversationData?.objective || 'Share perspectives, clarify the problem, and move toward useful next steps together.';
  const facilitatorTitle = conversationData?.sessions?.facilitator_details?.title;
  const facilitatorName = conversationData?.sessions?.facilitator_details?.name || facilitatorTitle || 'AI facilitator';
  const speechLanguage = conversationData?.language || conversationData?.sessions?.language || null;
  const visibleParticipants = participants.slice(0, 6);
  const remainingParticipantCount = Math.max(0, currentParticipantCount - visibleParticipants.length);
  const showOrientationCard = !isSessionEnded && filteredMessages.length <= 2;
  const [isMicPreviewOn, setIsMicPreviewOn] = useState(false);
  const [isCameraPreviewOn, setIsCameraPreviewOn] = useState(false);
  const [showLiveCaptionPreview, setShowLiveCaptionPreview] = useState(true);
  const nearbyParticipants = participants
    .filter((participant) => participant.id !== effectiveParticipantId)
    .slice(0, 4);
  const currentParticipantName = participantNames[effectiveParticipantId] || `Participant ${effectiveParticipantId}`;
  const mediaTileParticipants = [
    {
      id: 'ai-moderator',
      name: facilitatorName,
      role: 'AI moderator',
      status: 'Speaking-ready',
      isAi: true,
      cameraOn: true,
      micOn: true,
    },
    {
      id: `participant-${effectiveParticipantId}`,
      name: currentParticipantName,
      role: 'You',
      status: isMicPreviewOn ? 'Mic armed for spoken response' : 'Muted until your turn',
      isAi: false,
      cameraOn: isCameraPreviewOn,
      micOn: isMicPreviewOn,
    },
    ...nearbyParticipants.map((participant) => ({
      id: `participant-${participant.id}`,
      name: participant.name || `Participant ${participant.id}`,
      role: 'Participant',
      status: 'Listening',
      isAi: false,
      cameraOn: false,
      micOn: false,
    })),
  ];

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

      {showOrientationCard && (
        <div className="shrink-0 border-b border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-4 py-3">
          <div className="mx-auto grid max-w-5xl gap-3 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-3xl border border-indigo-100 bg-white/90 p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
                <Sparkles className="h-3.5 w-3.5" />
                Voice-first workshop room
              </div>
              <h2 className="text-sm font-semibold text-slate-900">{sessionTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{sessionObjective}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <Headphones className="mb-1 h-4 w-4 text-indigo-500" />
                  Use Read aloud to hear the AI moderator speak each facilitator prompt.
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <PenLine className="mb-1 h-4 w-4 text-indigo-500" />
                  Typing remains available as an accessible fallback whenever the input is open.
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  <Mic className="mb-1 h-4 w-4 text-indigo-500" />
                  Speak your answer with the microphone where your browser supports speech recognition.
                </div>
              </div>
              <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                This is a structured, voice-first AI workshop room. For face-to-face video presence, keep your Teams, Zoom, or Meet call open alongside AIfacilitator while the AI moderator guides the discussion here.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Live workshop room</p>
                  <p className="text-sm font-medium text-slate-900">Facilitated by {facilitatorName}</p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                  <Users className="h-3.5 w-3.5" />
                  {currentParticipantCount}/{maxParticipants}
                </div>
              </div>

              <div className="space-y-2">
                {visibleParticipants.length > 0 ? visibleParticipants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {(participant.name || `P${participant.id}`).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-800">{participant.name || `Participant ${participant.id}`}</p>
                      <p className="text-[11px] text-slate-500">In the room</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Participants will appear here as they join.</div>
                )}
                {remainingParticipantCount > 0 && (
                  <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    +{remainingParticipantCount} more participant{remainingParticipantCount === 1 ? '' : 's'} in the room
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                <Video className="h-4 w-4 text-slate-400" />
                Pair with Teams, Zoom, or Meet if your group wants to see each other while AIfacilitator moderates the workshop.
              </div>
            </div>
          </div>
        </div>
      )}


      {!isSessionEnded && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
          <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-slate-950/20">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-300/20">
                    <Radio className="h-3.5 w-3.5" />
                    P2 audio/video room shell
                  </div>
                  <h2 className="text-base font-semibold text-white">Live AI-moderated workshop</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
                    This validation layout prepares the in-app camera room, spoken turns, captions, AI moderator presence, and text fallback before connecting real media infrastructure.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMicPreviewOn((value) => !value)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isMicPreviewOn ? 'bg-emerald-400 text-emerald-950' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}
                  >
                    <Mic className="h-3.5 w-3.5" />
                    {isMicPreviewOn ? 'Mic ready' : 'Try mic'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraPreviewOn((value) => !value)}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition ${isCameraPreviewOn ? 'bg-sky-300 text-sky-950' : 'bg-white/10 text-slate-200 hover:bg-white/15'}`}
                  >
                    {isCameraPreviewOn ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}
                    {isCameraPreviewOn ? 'Camera preview' : 'Camera off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLiveCaptionPreview((value) => !value)}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/15"
                  >
                    <Captions className="h-3.5 w-3.5" />
                    Captions {showLiveCaptionPreview ? 'on' : 'off'}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mediaTileParticipants.map((tile) => (
                  <div key={tile.id} className={`relative overflow-hidden rounded-3xl border p-4 min-h-[150px] ${tile.isAi ? 'border-violet-300/30 bg-gradient-to-br from-violet-500/30 to-indigo-500/20' : 'border-white/10 bg-slate-900/80'}`}>
                    <div className="absolute right-3 top-3 flex gap-1.5">
                      <span className={`rounded-full p-1.5 ${tile.micOn ? 'bg-emerald-400 text-emerald-950' : 'bg-slate-800 text-slate-400'}`}>
                        <Mic className="h-3 w-3" />
                      </span>
                      <span className={`rounded-full p-1.5 ${tile.cameraOn ? 'bg-sky-300 text-sky-950' : 'bg-slate-800 text-slate-400'}`}>
                        {tile.cameraOn ? <Camera className="h-3 w-3" /> : <CameraOff className="h-3 w-3" />}
                      </span>
                    </div>
                    <div className="flex h-full flex-col justify-between gap-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/12 text-lg font-bold text-white ring-1 ring-white/10">
                        {tile.isAi ? <Sparkles className="h-6 w-6" /> : tile.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{tile.name}</p>
                        <p className="text-xs text-slate-300">{tile.role}</p>
                        <p className="mt-2 rounded-full bg-black/20 px-2 py-1 text-[11px] text-slate-200">{tile.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Volume2 className="h-4 w-4 text-violet-200" />
                  Moderator audio plan
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  The AI moderator tile is designed for spoken prompts, captions, and read-aloud playback. Real-time voice-agent connection remains the next infrastructure step.
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ShieldCheck className="h-4 w-4 text-emerald-200" />
                  Privacy first
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-300">
                  Camera and microphone states are explicit. Participants keep typing available, and device permissions should be requested only after a clear user action.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <MonitorPlay className="h-4 w-4 text-sky-200" />
                  Live transcript rail
                </div>
                {showLiveCaptionPreview ? (
                  <p className="mt-2 text-xs leading-5 text-slate-300">
                    Preview: spoken responses will appear here as captions before being submitted to the facilitator flow.
                  </p>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-slate-500">Captions are hidden in this preview state.</p>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

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
            speechLanguage={speechLanguage}
          />
        </div>
      )}
    </div>
  );
};

export default ParticipantMessagingView;
