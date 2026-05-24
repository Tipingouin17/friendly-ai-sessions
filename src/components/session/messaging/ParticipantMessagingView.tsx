/**
 * ParticipantMessagingView — Signal & Clarity light integration slice
 *
 * This component adopts the UX handoff's role-aware participant shell while
 * preserving the existing session runtime, transcript, speech, and InputFooter
 * behavior. The page now prioritizes the AI spotlight, current prompt progress,
 * and a People/Chat side surface instead of a transcript-first layout.
 */

import React from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import type { ConversationWithSession } from '@/types/database';
import type { UseStreamingFacilitatorRuntimeResult } from '@/hooks/facilitator/useStreamingFacilitatorRuntime';
import InputFooter from '@/components/session/InputFooter';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';
import { Captions, CheckCircle2, Home, MessageSquare, Mic, Sparkles, Users, Video, VideoOff } from 'lucide-react';
import FacilitatorAvatar from '@/components/chat/avatars/FacilitatorAvatar';
import { SessionVideoGrid, type SessionVideoParticipant } from '@/components/session/video/SessionVideoGrid';
import type { FacilitatorToolAssignment } from '@/types/facilitator';
import { recordSpeechTurn } from '@/services/facilitator/phase3RuntimeService';
import { useFacilitatorVoice } from '@/hooks/facilitator/useFacilitatorVoice';
import { usePhase3RuntimeSettings } from '@/hooks/facilitator/usePhase3RuntimeSettings';
import { useWebRTCSession } from '@/hooks/useWebRTCSession';
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

type SidebarTab = 'people' | 'chat';

const formatParticipantInitials = (participant: ParticipantInfo): string => {
  const source = participant.name?.trim() || `P${participant.id}`;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatLastActive = (participant: ParticipantInfo): string => {
  if (!participant.lastActive) return 'Active now';
  const minutes = Math.max(0, Math.round((Date.now() - participant.lastActive.getTime()) / 60000));
  if (minutes <= 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
};

const getMessageTime = (message: Message): string => {
  const rawTimestamp = message.created_at || message.timestamp;
  if (!rawTimestamp) return '';
  const timestamp = rawTimestamp instanceof Date ? rawTimestamp : new Date(rawTimestamp);
  if (Number.isNaN(timestamp.getTime())) return '';
  return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

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
  const [sidebarTab, setSidebarTab] = React.useState<SidebarTab>('people');
  const [localCameraStream, setLocalCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = React.useState<'off' | 'starting' | 'on' | 'blocked' | 'unsupported'>('off');
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const localCameraStreamRef = React.useRef<MediaStream | null>(null);
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
  const { data: phase3Settings, isPlaceholderData: isPhase3SettingsPending } = usePhase3RuntimeSettings(conversationData?.language);
  const phase3RuntimeReady = !isPhase3SettingsPending;
  const speechStackEnabled = Boolean(phase3RuntimeReady && phase3Settings?.speech_stack_enabled);
  const ttsAvatarEnabled = Boolean(phase3RuntimeReady && phase3Settings?.tts_avatar_enabled);
  const analyticsPersistenceEnabled = Boolean(phase3RuntimeReady && phase3Settings?.facilitation_analytics_enabled);
  const voiceRuntime = useFacilitatorVoice({
    conversationId,
    facilitatorId,
    enabled: viewMode === 'participant' && ttsAvatarEnabled,
    defaultVoiceId: phase3Settings?.tts_default_voice_id ?? null,
    lipSyncEnabled: phase3Settings?.tts_lip_sync_enabled ?? true,
    persistEvents: analyticsPersistenceEnabled,
  });
  const runtimeAvatarState = voiceRuntime.isSpeaking
    ? voiceRuntime.runtimeAvatarState
    : facilitatorRuntime?.avatarState ?? null;
  const showRuntimeAvatarState = Boolean((facilitatorRuntime?.enabled && runtimeAvatarState) || voiceRuntime.isSpeaking);
  const aiIsSpeaking = Boolean(voiceRuntime.isSpeaking || runtimeAvatarState?.state === 'speaking');
  const modeLabel = activeMode?.name || enabledModes.find((mode) => mode.mode_slug === activeMode?.mode_slug)?.name || 'Open Discussion';
  const latestAssistantMessage = React.useMemo(() => {
    return [...messages].reverse().find((message) => message.sender === 'assistant') ?? null;
  }, [messages]);
  const latestParticipantMessages = React.useMemo(() => {
    return [...filteredMessages].reverse().filter((message) => message.sender !== 'assistant').slice(0, 4).reverse();
  }, [filteredMessages]);
  const latestOwnParticipantMessage = React.useMemo(() => {
    const participantKey = String(effectiveParticipantId);
    const latestAssistantIndex = filteredMessages.map((message) => message.sender).lastIndexOf('assistant');
    const responseWindow = latestAssistantIndex >= 0 ? filteredMessages.slice(latestAssistantIndex + 1) : filteredMessages;

    return [...responseWindow]
      .reverse()
      .find((message) => message.sender === 'user' && (effectiveParticipantId === 0 || String(message.participant) === participantKey)) ?? null;
  }, [effectiveParticipantId, filteredMessages]);
  const hasRegisteredResponse = Boolean(hasAnswered || latestOwnParticipantMessage);
  const responseTotal = Math.max(totalParticipants, currentParticipantCount, participants.length, 1);
  const effectiveResponseCount = Math.min(responseTotal, Math.max(responseCount, hasRegisteredResponse ? 1 : 0));
  const responseProgress = Math.min(100, Math.round((effectiveResponseCount / responseTotal) * 100));
  const stopLocalCamera = React.useCallback(() => {
    if (localCameraStreamRef.current) {
      localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      localCameraStreamRef.current = null;
    }
    setLocalCameraStream(null);
    setCameraStatus('off');
  }, []);

  const startLocalCamera = React.useCallback(async () => {
    if (cameraStatus === 'starting') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setCameraError('Camera preview is not supported in this browser.');
      return;
    }

    setCameraStatus('starting');
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });

      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      localCameraStreamRef.current = stream;
      setLocalCameraStream(stream);
      setCameraStatus('on');
    } catch (error) {
      console.error('Error accessing participant camera:', error);
      setLocalCameraStream(null);
      localCameraStreamRef.current = null;
      setCameraStatus('blocked');
      setCameraError('Camera access was blocked. Allow camera permission in your browser to show your preview.');
    }
  }, [cameraStatus]);

  const toggleLocalCamera = React.useCallback(() => {
    if (localCameraStreamRef.current) {
      stopLocalCamera();
      return;
    }
    void startLocalCamera();
  }, [startLocalCamera, stopLocalCamera]);

  React.useEffect(() => {
    return () => {
      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
        localCameraStreamRef.current = null;
      }
    };
  }, []);

  const activeParticipants = participants.length > 0
    ? participants
    : Array.from({ length: currentParticipantCount }, (_, index) => ({ id: index + 1, name: participantNames[index + 1] || `Participant ${index + 1}` } as ParticipantInfo));
  const orderedVideoParticipants = [...activeParticipants].sort((first, second) => {
    if (first.id === effectiveParticipantId) return -1;
    if (second.id === effectiveParticipantId) return 1;
    return first.id - second.id;
  });
  const { remoteStreams, isSignalingConnected } = useWebRTCSession({
    conversationId,
    role: 'participant',
    participantId: effectiveParticipantId,
    participants: activeParticipants,
    localStream: localCameraStream,
    enabled: !isSessionEnded,
  });
  const participantVideoTiles: SessionVideoParticipant[] = orderedVideoParticipants.map((participant) => ({
    id: String(participant.id),
    name: participant.id === effectiveParticipantId ? `${participant.name || 'You'} (You)` : participant.name || `Participant ${participant.id}`,
    initials: formatParticipantInitials(participant),
    avatarUrl: participant.avatar,
    accentColor: participantColors[String(participant.id)] || undefined,
    mediaStream: participant.id === effectiveParticipantId ? localCameraStream : remoteStreams[String(participant.id)] ?? null,
    isYou: participant.id === effectiveParticipantId,
    isMuted: participant.id !== effectiveParticipantId || !isRecording,
    isSpeaking: participant.id === effectiveParticipantId && isRecording,
  }));
  const currentParticipantInfo = activeParticipants.find((participant) => participant.id === effectiveParticipantId);
  const cameraIsOn = cameraStatus === 'on' && Boolean(localCameraStream);
  const cameraStatusLabel = cameraStatus === 'starting'
    ? 'Starting camera…'
    : cameraStatus === 'on'
    ? 'Camera on'
    : cameraStatus === 'blocked'
    ? 'Camera blocked'
    : cameraStatus === 'unsupported'
    ? 'Camera unsupported'
    : 'Camera off';

  const lastSpokenAssistantMessageRef = React.useRef<string | null>(null);
  const lastAssistantMessage = React.useMemo(() => {
    return [...messages].reverse().find((message) => message.sender === 'assistant') ?? null;
  }, [messages]);

  React.useEffect(() => {
    if (!phase3RuntimeReady || !ttsAvatarEnabled || !lastAssistantMessage || !conversationId) return;
    if (lastSpokenAssistantMessageRef.current === lastAssistantMessage.id) return;
    lastSpokenAssistantMessageRef.current = lastAssistantMessage.id;
    void voiceRuntime.speak({
      text: lastAssistantMessage.content,
      messageId: lastAssistantMessage.id,
      metadata: { source: 'participant_messaging_view' },
    });
  }, [conversationId, lastAssistantMessage, phase3RuntimeReady, ttsAvatarEnabled, voiceRuntime]);

  const handleSpeechInterim = React.useCallback((payload: { transcript: string; confidence: number | null }) => {
    if (!speechStackEnabled) return;
    facilitatorRuntime?.pushStreamChunk({
      modality: 'speech',
      status: 'partial',
      text: payload.transcript,
      confidence: payload.confidence ?? undefined,
    });
  }, [facilitatorRuntime, speechStackEnabled]);

  const handleSpeechFinal = React.useCallback((payload: { transcript: string; confidence: number | null; startedAt: string | null; endedAt: string; durationMs: number | null }) => {
    if (!conversationId || !speechStackEnabled) return;
    facilitatorRuntime?.pushStreamChunk({
      modality: 'speech',
      status: 'final',
      text: payload.transcript,
      confidence: payload.confidence ?? undefined,
    });
    if (!analyticsPersistenceEnabled) return;
    void recordSpeechTurn({
      conversationId,
      facilitatorId,
      participantId: effectiveParticipantId,
      speakerRole: 'participant',
      transcript: payload.transcript,
      confidence: payload.confidence,
      language: phase3Settings?.speech_default_language || conversationData?.language || 'en-US',
      source: 'browser_speech_recognition',
      durationMs: payload.durationMs,
      startedAt: payload.startedAt,
      endedAt: payload.endedAt,
      metrics: { composer: 'participant_chat_input' },
    });
  }, [analyticsPersistenceEnabled, conversationData?.language, conversationId, effectiveParticipantId, facilitatorId, facilitatorRuntime, phase3Settings?.speech_default_language, speechStackEnabled]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-50 text-slate-950">
      <div className="shrink-0 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-2xl shadow-slate-200/80 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/25 bg-indigo-500/15 text-indigo-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold tracking-tight text-slate-950">{sessionTitle}</p>
            <p className="truncate text-xs text-slate-500">Facilitated by {facilitatorName}</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
            Live
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {currentParticipantCount}/{maxParticipants}
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-200 hover:text-slate-950"
              aria-label="Microphone status"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={toggleLocalCamera}
              disabled={cameraStatus === 'starting'}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition disabled:cursor-wait disabled:opacity-70 ${cameraIsOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-200 hover:text-slate-950'}`}
              aria-label={cameraIsOn ? 'Turn camera off' : 'Turn camera on'}
              title={cameraStatusLabel}
              data-camera-toggle="participant-local-preview"
            >
              {cameraIsOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-200 hover:text-slate-950"
              aria-label="Captions status"
            >
              <Captions className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
          <section className="min-h-0 flex-1 overflow-y-auto p-3 md:p-4">
            <div
              className={`relative flex h-[min(52vh,420px)] min-h-[260px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.18),rgba(255,255,255,0.92)_45%,rgba(241,245,249,0.9))] ${aiIsSpeaking ? 'border-amber-300/70 shadow-[0_0_40px_rgba(245,158,11,0.22)] animate-ai-speaking' : 'border-slate-200'}`}
            >
              <div className="absolute left-4 top-4 z-10 rounded-full border border-amber-300/35 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-700">
                AI
              </div>
              <div className="absolute right-4 top-4 z-10 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur">
                {aiIsSpeaking ? 'AI speaking' : runtimeAvatarState?.reason || 'AI monitoring'}
              </div>
              {facilitatorAvatarUrl ? (
                <img
                  src={facilitatorAvatarUrl}
                  alt={facilitatorName}
                  className="h-full w-full object-contain object-top p-4"
                />
              ) : showRuntimeAvatarState ? (
                <FacilitatorAvatar
                  avatarUrl={facilitatorAvatarUrl}
                  name={facilitatorName}
                  size="xl"
                  runtimeState={runtimeAvatarState}
                  enableRuntimeAnimation
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-[2rem] border border-amber-300/30 bg-amber-300/10 text-amber-700 shadow-2xl shadow-amber-200/70">
                  <Sparkles className="h-16 w-16" />
                </div>
              )}
              {aiIsSpeaking && (
                <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-1 rounded-full border border-amber-300/25 bg-white/85 px-3 py-2 backdrop-blur">
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="block w-1.5 origin-bottom rounded-full bg-amber-300 animate-sound-bar"
                      style={{ height: `${10 + (bar % 3) * 5}px`, animationDelay: `${bar * 90}ms` }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-indigo-300/20 bg-indigo-50 p-4 shadow-lg shadow-slate-200/70">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Current question</span>
                <span className="rounded-full border border-indigo-300/25 bg-indigo-400/10 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {isWaitingForResponses || isWaitingForResponse ? 'Collecting responses' : modeLabel}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed text-slate-900 md:text-base">
                {latestAssistantMessage?.content || 'The AI facilitator is preparing the next question for the room.'}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-400 transition-all duration-700" style={{ width: `${responseProgress}%` }} />
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-500">{effectiveResponseCount}/{responseTotal} responded</span>
              </div>
            </div>

            {hasRegisteredResponse && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-lg shadow-emerald-100/80">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Your response is registered
                </div>
                {latestOwnParticipantMessage ? (
                  <blockquote className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-800">
                    {latestOwnParticipantMessage.content}
                  </blockquote>
                ) : (
                  <p className="text-sm leading-relaxed text-emerald-800">
                    Your answer has been submitted. Waiting for the rest of the room before the facilitator continues.
                  </p>
                )}
              </div>
            )}
          </section>

          {isSessionEnded ? (
            <div className="shrink-0 border-t border-amber-300/20 bg-amber-300/10 px-4 py-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-950">This session has ended</p>
                  <p className="text-xs text-amber-700">Thank you for your participation.</p>
                </div>
                <button
                  onClick={() => window.location.href = '/'}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400 active:scale-95"
                >
                  <Home className="h-4 w-4" />
                  Return Home
                </button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-slate-200 bg-white">
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
                speechEnabled={speechStackEnabled}
                speechLanguage={phase3Settings?.speech_default_language || conversationData?.language || 'en-US'}
                onSpeechInterim={handleSpeechInterim}
                onSpeechFinal={handleSpeechFinal}
              />
            </div>
          )}
        </main>

        <aside className="hidden w-[292px] shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 md:flex">
          <div className="flex border-b border-slate-200 p-2">
            <button
              type="button"
              onClick={() => setSidebarTab('people')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${sidebarTab === 'people' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/70' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}
            >
              <Users className="h-4 w-4" />
              People
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('chat')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${sidebarTab === 'chat' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200/70' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>

          {sidebarTab === 'people' ? (
            <div className="flex min-h-0 flex-1 flex-col p-3">
              <SessionVideoGrid
                participants={participantVideoTiles}
                variant="participant-sidebar"
                emptyLabel="Video tiles will appear as participants join the session."
              />
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-950">{currentParticipantInfo?.name || 'You'}</span>
                  <button
                    type="button"
                    onClick={toggleLocalCamera}
                    disabled={cameraStatus === 'starting'}
                    className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                    data-camera-toggle="participant-sidebar-preview"
                  >
                    {cameraIsOn ? 'Camera off' : 'Camera on'}
                  </button>
                </div>
                <span className="text-slate-500">Muted · {cameraStatusLabel} · {isSignalingConnected ? 'video room connected' : 'connecting video room'}</span>
                {cameraError && <p className="mt-1 text-[11px] leading-snug text-rose-600">{cameraError}</p>}
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {latestParticipantMessages.length > 0 ? (
                <div className="space-y-3">
                  {latestParticipantMessages.map((message) => (
                    <div key={message.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs font-semibold text-indigo-700">{message.name || message.participant || 'Participant'}</span>
                        <span className="font-mono text-[10px] text-slate-500">{getMessageTime(message)}</span>
                      </div>
                      <p className="line-clamp-4 text-xs leading-relaxed text-slate-700">{message.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                  Participant messages will appear here during the session.
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      <div className="grid shrink-0 grid-cols-2 border-t border-slate-200 bg-white p-2 md:hidden">
        <button type="button" onClick={() => setSidebarTab('people')} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4" /> People
        </button>
        <button type="button" onClick={() => setSidebarTab('chat')} className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-800">
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
      </div>
    </div>
  );
};

export default ParticipantMessagingView;
