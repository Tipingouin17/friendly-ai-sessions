/**
 * Input Footer
 *
 * Adaptive participant composer for facilitation modes. The footer preserves the
 * existing engagement controls and chat composer while rendering mode-specific
 * input panels for open discussion, round robin, silent response, voting,
 * reflection, and debate.
 */

import React from 'react';
import ChatInput from "@/components/chat/ChatInput";
import { Message, ParticipantInfo } from "@/types/chat";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  ChevronDown,
  Hand,
  Lock,
  Mic,
  MicOff,
  MoreHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import ParticipantEngagementControls from './ParticipantEngagementControls';
import { useParticipantEngagement } from '@/hooks/useParticipantEngagement';

interface ModeComposerContext {
  label: string;
  instruction: string;
  component?: string | null;
  modeKey?: string | null;
  stateLabel?: string;
  isComplete?: boolean;
}

export interface AdaptiveModeOption {
  id: string;
  label: string;
  description?: string;
  value?: unknown;
}

type ParticipantModeTurnState = {
  is_current_speaker?: boolean | null;
  is_next?: boolean | null;
  remaining_time?: number | null;
  state?: Record<string, unknown> | null;
};

type HandRaiseState = 'idle' | 'raised' | 'floor_granted';

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
  disabledPlaceholder?: string;
  disabled?: boolean;
  modeContext?: ModeComposerContext;
  modeOptions?: AdaptiveModeOption[];
  selectedModeOptionId?: string | null;
  submittingModeOptionId?: string | null;
  modeCanSubmit?: boolean;
  participantModeState?: ParticipantModeTurnState | null;
  modeInputError?: string | null;
  onVote?: (choice: AdaptiveModeOption) => void | Promise<void>;
  onWordPick?: (choice: AdaptiveModeOption) => void | Promise<void>;
  onReaction?: (reaction: string) => void | Promise<void>;
  handRaiseState?: HandRaiseState;
  onHandRaiseToggle?: (raised: boolean) => void | Promise<void>;
}

const REACTIONS = ['✋', '👋', '👍', '❓'] as const;
const DEFAULT_VOTE_OPTIONS: AdaptiveModeOption[] = [
  { id: 'strongly-agree', label: 'Strongly Agree', value: 'strongly-agree' },
  { id: 'agree', label: 'Agree', value: 'agree' },
  { id: 'neutral', label: 'Neutral', value: 'neutral' },
  { id: 'disagree', label: 'Disagree', value: 'disagree' },
];
const DEFAULT_REFLECTION_OPTIONS: AdaptiveModeOption[] = [
  { id: 'energised', label: 'Energised', value: 'energised' },
  { id: 'curious', label: 'Curious', value: 'curious' },
  { id: 'uncertain', label: 'Uncertain', value: 'uncertain' },
  { id: 'focused', label: 'Focused', value: 'focused' },
  { id: 'inspired', label: 'Inspired', value: 'inspired' },
  { id: 'overwhelmed', label: 'Overwhelmed', value: 'overwhelmed' },
  { id: 'hopeful', label: 'Hopeful', value: 'hopeful' },
  { id: 'confused', label: 'Confused', value: 'confused' },
];

const normalizeModeKey = (modeKey?: string | null): string => {
  const normalized = (modeKey || 'open_discussion').trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'voting') return 'voting_rating';
  if (normalized === 'reflection') return 'reflection_checkin';
  if (normalized === 'silent_response') return 'silent_individual_response';
  return normalized;
};

const formatModeComponentLabel = (component?: string | null): string => {
  if (!component) return 'Facilitation mode';
  return component.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
};

const getModeAccent = (modeKey: string, isComplete?: boolean) => {
  if (isComplete) return { strip: 'border-emerald-200 bg-emerald-50 text-emerald-900', badge: 'bg-emerald-600 text-white', dot: 'bg-emerald-500', panel: 'border-emerald-200 bg-emerald-50/70', label: 'text-emerald-700', soft: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (modeKey === 'voting_rating') return { strip: 'border-emerald-200 bg-emerald-50 text-emerald-950', badge: 'bg-emerald-600 text-white', dot: 'bg-emerald-500', panel: 'border-emerald-200 bg-emerald-50/70', label: 'text-emerald-700', soft: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  if (modeKey === 'round_robin') return { strip: 'border-teal-200 bg-teal-50 text-teal-950', badge: 'bg-teal-600 text-white', dot: 'bg-teal-500', panel: 'border-teal-200 bg-teal-50/70', label: 'text-teal-700', soft: 'bg-teal-50 text-teal-800 border-teal-200' };
  if (modeKey === 'silent_individual_response') return { strip: 'border-amber-200 bg-amber-50 text-amber-950', badge: 'bg-amber-500 text-white', dot: 'bg-amber-500', panel: 'border-amber-200 bg-amber-50/70', label: 'text-amber-700', soft: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (modeKey === 'reflection_checkin') return { strip: 'border-rose-200 bg-rose-50 text-rose-950', badge: 'bg-rose-500 text-white', dot: 'bg-rose-500', panel: 'border-rose-200 bg-rose-50/70', label: 'text-rose-700', soft: 'bg-rose-50 text-rose-800 border-rose-200' };
  if (modeKey === 'debate') return { strip: 'border-red-200 bg-red-50 text-red-950', badge: 'bg-red-500 text-white', dot: 'bg-red-500', panel: 'border-red-200 bg-red-50/70', label: 'text-red-700', soft: 'bg-red-50 text-red-800 border-red-200' };
  return { strip: 'border-indigo-200 bg-indigo-50 text-indigo-950', badge: 'bg-indigo-600 text-white', dot: 'bg-indigo-500', panel: 'border-indigo-200 bg-indigo-50/70', label: 'text-indigo-700', soft: 'bg-indigo-50 text-indigo-800 border-indigo-200' };
};

const getVoteEmoji = (label: string, index: number): string => {
  const lower = label.toLowerCase();
  if (lower.includes('strongly') && (lower.includes('agree') || lower.includes('yes'))) return '💯';
  if (lower.includes('agree') || lower.includes('yes')) return '👍';
  if (lower.includes('neutral') || lower.includes('unsure') || lower.includes('maybe')) return '🥺';
  if (lower.includes('no') || lower.includes('disagree')) return '👎';
  if (lower.includes('discuss') || lower.includes('question')) return '💬';
  return ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'][index] ?? '•';
};

const MicLiveIndicator = ({ isLive, label = 'Mic live' }: { isLive: boolean; label?: string }) => (
  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
    <span className={`h-2 w-2 rounded-full ${isLive ? 'animate-pulse bg-emerald-500 motion-reduce:animate-none' : 'bg-slate-300'}`} />
    <Mic className="h-3.5 w-3.5" />
    {label}
  </div>
);

const ModeStageHeader = ({ label, instruction, accent, onOverflow, showOverflow, overflowLabel, overflowState }: {
  label: string;
  instruction: string;
  accent: ReturnType<typeof getModeAccent>;
  onOverflow: () => void;
  showOverflow: boolean;
  overflowLabel: string;
  overflowState?: string;
}) => (
  <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${accent.soft}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${accent.dot}`} />{label}
    </span>
    <p className="min-w-0 flex-1 truncate text-sm text-slate-600">{instruction}</p>
    <div className="relative">
      <button type="button" onClick={onOverflow} aria-expanded={showOverflow} aria-label="More facilitation details" className="session-control-button inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {showOverflow && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-xs text-slate-600 shadow-xl">
          <p className="font-bold text-slate-900">{overflowLabel}</p><p className="mt-1 leading-relaxed">{instruction}</p>
          {overflowState && <p className="mt-2 font-semibold text-slate-700">State: {overflowState}</p>}
        </div>
      )}
    </div>
  </div>
);

const QuickReactions = ({ onReaction, compact = false }: { onReaction?: (reaction: string) => void | Promise<void>; compact?: boolean }) => {
  const [sentReaction, setSentReaction] = React.useState<string | null>(null);
  const handleReaction = (reaction: string) => {
    setSentReaction(reaction);
    void onReaction?.(reaction);
    window.setTimeout(() => setSentReaction((current) => current === reaction ? null : current), 1400);
  };
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Quick reactions">
      {REACTIONS.map((reaction) => (
        <button
          key={reaction}
          type="button"
          onClick={() => handleReaction(reaction)}
          aria-label={`Send ${reaction} reaction`}
          className={`${compact ? 'h-8 w-8' : 'h-8 w-8 sm:h-9 sm:w-9'} inline-flex items-center justify-center rounded-full border text-base shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${sentReaction === reaction ? 'border-emerald-300 bg-emerald-50 ring-2 ring-emerald-200' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'}`}
        >
          <span aria-hidden="true">{reaction}</span>
        </button>
      ))}
    </div>
  );
};

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
  disabledPlaceholder,
  disabled = false,
  modeContext,
  modeOptions = [],
  selectedModeOptionId = null,
  submittingModeOptionId = null,
  modeCanSubmit = true,
  participantModeState = null,
  modeInputError = null,
  onVote,
  onWordPick,
  onReaction,
  handRaiseState = 'idle',
  onHandRaiseToggle,
}: InputFooterProps) => {
  const isMobile = useIsMobile();
  const { maxQuestionsPerSession } = usePlanLimits();
  const [showOverflow, setShowOverflow] = React.useState(false);
  const [showAllReflectionWords, setShowAllReflectionWords] = React.useState(false);
  const [localHandRaised, setLocalHandRaised] = React.useState(false);
  const [transitionNotice, setTransitionNotice] = React.useState<string | null>(null);
  const [isPanelFading, setIsPanelFading] = React.useState(false);
  const [savedNotice, setSavedNotice] = React.useState<string | null>(null);
  const previousModeKeyRef = React.useRef<string | null>(null);
  const previousCompleteRef = React.useRef(Boolean(modeContext?.isComplete));

  const participantInfo = participants.find(p => p.id === currentParticipant);
  const participantName = participantInfo?.name || participantNames[currentParticipant] || `Participant ${currentParticipant}`;

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
  } = useParticipantEngagement({ conversationId, participantId: currentUserParticipantId ?? currentParticipant, participantName });

  const effectiveParticipantId = currentUserParticipantId ?? currentParticipant;
  React.useEffect(() => { onParticipantStatusChange?.(effectiveParticipantId, status); }, [status, effectiveParticipantId, onParticipantStatusChange]);

  const lastAssistantMessageId = React.useMemo(() => {
    const assistantMessages = messages.filter(m => m.sender === 'assistant');
    return assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].id : null;
  }, [messages]);
  React.useEffect(() => { resetSkip(); }, [lastAssistantMessageId, resetSkip]);

  const isNewSession = Array.isArray(messages) && messages.length <= 1 && messages.every(msg => msg.sender === 'assistant' || msg.id === 'welcome');
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const modeKey = normalizeModeKey(modeContext?.modeKey);
  const isOpenDiscussionMode = modeKey === 'open_discussion';
  const shouldAllowAnswer = (isOpenDiscussionMode || lastMessage?.sender === 'assistant' || isNewSession || !hasAnswered) && !isPaused && !isSkipped && !disabled;
  const participantKey = String(effectiveParticipantId);
  const userMessageCount = Array.isArray(messages) ? messages.filter(m => m.sender === 'user' && m.participant === participantKey).length : 0;
  const hasReachedQuestionLimit = maxQuestionsPerSession !== Infinity && userMessageCount >= maxQuestionsPerSession;

  const urlParams = new URLSearchParams(window.location.search);
  const hasParticipantParams = urlParams.has('participantId') || urlParams.has('name');
  const isParticipantContext = hasParticipantParams || viewMode === "participant";
  const accent = getModeAccent(modeKey, modeContext?.isComplete);
  const modeComponentLabel = formatModeComponentLabel(modeContext?.component);
  const handRaised = handRaiseState === 'raised' || (handRaiseState === 'idle' && localHandRaised);
  const floorGranted = handRaiseState === 'floor_granted';
  const effectiveVoteOptions = modeOptions.length > 0 ? modeOptions : DEFAULT_VOTE_OPTIONS;
  const effectiveReflectionOptions = modeOptions.length > 0 ? modeOptions : DEFAULT_REFLECTION_OPTIONS;
  const visibleReflectionOptions = showAllReflectionWords ? effectiveReflectionOptions : effectiveReflectionOptions.slice(0, isMobile ? 6 : 8);
  const activeModeIdentity = `${modeKey}:${modeContext?.label ?? ''}:${modeContext?.component ?? ''}`;

  React.useEffect(() => {
    const previousModeKey = previousModeKeyRef.current;
    if (previousModeKey && previousModeKey !== activeModeIdentity) {
      setTransitionNotice('Facilitation mode changed. Unsaved draft input was cleared.');
      setIsPanelFading(true);
      setShowAllReflectionWords(false);
      setInputMessage('');
      const bannerTimer = window.setTimeout(() => setTransitionNotice(null), 200);
      const fadeTimer = window.setTimeout(() => setIsPanelFading(false), 200);
      previousModeKeyRef.current = activeModeIdentity;
      return () => { window.clearTimeout(bannerTimer); window.clearTimeout(fadeTimer); };
    }
    previousModeKeyRef.current = activeModeIdentity;
  }, [activeModeIdentity, setInputMessage]);

  React.useEffect(() => {
    const wasComplete = previousCompleteRef.current;
    const isComplete = Boolean(modeContext?.isComplete);
    if (!wasComplete && isComplete) {
      setSavedNotice('Response saved. Waiting for the facilitator to continue.');
      const timer = window.setTimeout(() => setSavedNotice(null), 3000);
      previousCompleteRef.current = isComplete;
      return () => window.clearTimeout(timer);
    }
    previousCompleteRef.current = isComplete;
  }, [modeContext?.isComplete]);

  const handleHandRaiseToggle = () => {
    const nextRaised = !(handRaised || floorGranted);
    if (handRaiseState === 'idle') setLocalHandRaised(nextRaised);
    void onHandRaiseToggle?.(nextRaised);
  };

  if (viewMode === "admin" && !isParticipantContext) return null;

  const renderModeStrip = () => null;

  const renderStageHeader = () => modeContext ? (
    <ModeStageHeader
      label={modeContext.label}
      instruction={modeContext.instruction}
      accent={accent}
      onOverflow={() => setShowOverflow((current) => !current)}
      showOverflow={showOverflow}
      overflowLabel={modeComponentLabel}
      overflowState={modeContext.stateLabel}
    />
  ) : null;

  const renderOpenDiscussionPanel = () => (
    <div className="mx-3 rounded-2xl border border-indigo-100 bg-white p-3 shadow-sm sm:mx-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600"><Mic className="h-5 w-5" /></div>
          <div className="min-w-0"><p className="text-sm font-black text-slate-950">You're live — speak freely</p><p className="text-xs leading-relaxed text-slate-600">The AI facilitator is listening to the room. Everyone can speak at the same time.</p></div>
        </div>
        <QuickReactions onReaction={onReaction} compact={isMobile} />
      </div>
      <ChatInput inputMessage={inputMessage} setInputMessage={setInputMessage} onSendMessage={onSendMessage} isRecording={isRecording} setIsRecording={setIsRecording} placeholder={!shouldAllowAnswer && disabledPlaceholder ? disabledPlaceholder : placeholder} disabled={!shouldAllowAnswer} isMobile={isMobile} speechEnabled={speechEnabled} speechLanguage={speechLanguage} onSpeechInterim={onSpeechInterim} onSpeechFinal={onSpeechFinal} />
    </div>
  );

  const renderRoundRobinPanel = () => {
    const isCurrent = Boolean(participantModeState?.is_current_speaker);
    const isNext = Boolean(participantModeState?.is_next);
    const state = participantModeState?.state ?? {};
    const stateCurrentSpeakerId = typeof state.current_speaker_id === 'number' ? state.current_speaker_id : typeof state.currentSpeakerId === 'number' ? state.currentSpeakerId : null;
    const currentSpeakerId = isCurrent ? effectiveParticipantId : stateCurrentSpeakerId;
    const currentSpeakerName = typeof state.current_speaker_name === 'string' ? state.current_speaker_name : typeof state.currentSpeakerName === 'string' ? state.currentSpeakerName : participants.find((participant) => participant.id === currentSpeakerId)?.name;
    const waitingTitle = currentSpeakerName ? `Please wait — ${currentSpeakerName} is speaking` : 'Please wait — another participant is speaking';
    const title = isCurrent ? 'Your turn — speak now' : waitingTitle;
    const copy = isCurrent ? 'The floor is yours. Speak now or type your response.' : isNext ? "You're next in the queue. The AI will call on you shortly." : 'You are in the queue. The AI will call on you shortly.';
    const speakingOrder = participants.slice(0, 8);
    return (
      <div className="mx-3 rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-4">
        {speakingOrder.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Speaking order:</span>
            {speakingOrder.map((participant) => {
              const isActiveSpeaker = participant.id === currentSpeakerId;
              return <span key={participant.id} className={`rounded-full px-2.5 py-1 font-bold ${isActiveSpeaker ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' : 'bg-slate-100 text-slate-600'}`}>{isActiveSpeaker ? `🎤 ${participant.name || 'You'}` : participant.name || `Participant ${participant.id}`}</span>;
            })}
          </div>
        )}
        <div className="flex items-center gap-3 p-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${isCurrent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{isCurrent ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-950">{title}</p><p className="text-xs leading-relaxed text-slate-600">{copy}</p></div>
          {isCurrent ? <MicLiveIndicator isLive={isRecording} label={isRecording ? 'Mic live' : 'Floor open'} /> : null}
        </div>
        <div className="border-t border-slate-100 p-3">
          <ChatInput inputMessage={inputMessage} setInputMessage={setInputMessage} onSendMessage={onSendMessage} isRecording={isRecording} setIsRecording={setIsRecording} placeholder={!shouldAllowAnswer && disabledPlaceholder ? disabledPlaceholder : placeholder} disabled={!shouldAllowAnswer} isMobile={isMobile} speechEnabled={speechEnabled} speechLanguage={speechLanguage} onSpeechInterim={onSpeechInterim} onSpeechFinal={onSpeechFinal} />
        </div>
      </div>
    );
  };

  const renderSilentResponsePanel = () => (
    <div className="mx-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:mx-4">
      <ChatInput inputMessage={inputMessage} setInputMessage={setInputMessage} onSendMessage={onSendMessage} isRecording={isRecording} setIsRecording={setIsRecording} placeholder={!shouldAllowAnswer && disabledPlaceholder ? disabledPlaceholder : placeholder} disabled={!shouldAllowAnswer} isMobile={isMobile} speechEnabled={speechEnabled} speechLanguage={speechLanguage} onSpeechInterim={onSpeechInterim} onSpeechFinal={onSpeechFinal} />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-amber-700"><span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> AI will combine all answers</span><span>{inputMessage.length}/2000</span></div>
      <p className="sr-only" aria-live="polite">Silent response mode is active. Your answer is private until the facilitator synthesizes responses.</p>
    </div>
  );

  const renderVotingPanel = () => (
    <div className="mx-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-sm sm:mx-4">
      <p className="mb-3 text-sm font-black text-emerald-800">Vote — your choice is private until all votes are in</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Voting options">
        {effectiveVoteOptions.slice(0, 6).map((choice, index) => {
          const isSelected = selectedModeOptionId === choice.id;
          const isSubmitting = submittingModeOptionId === choice.id;
          const canSelect = modeCanSubmit && !isPaused && !isSkipped && !isSubmitting;
          return <button key={choice.id} type="button" role="radio" aria-checked={isSelected} aria-label={`Vote for ${choice.label}`} onClick={() => canSelect && void onVote?.(choice)} disabled={!canSelect} className={`session-control-button min-h-[52px] rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${isSelected ? 'scale-[1.01] border-emerald-400 bg-white text-emerald-900 shadow-sm' : 'border-slate-200 bg-white text-slate-800 hover:border-emerald-300 hover:bg-emerald-50'}`}><span className="flex items-center gap-3 text-sm font-black"><span aria-hidden="true">{getVoteEmoji(choice.label, index)}</span><span className="min-w-0 flex-1 truncate">{isSubmitting ? 'Submitting…' : choice.label}</span>{isSelected && <Check className="h-4 w-4 text-emerald-600" />}</span>{choice.description && <span className="mt-1 block text-xs leading-snug opacity-70">{choice.description}</span>}</button>;
        })}
      </div>
      {!modeCanSubmit && <p className="mt-2 text-xs font-semibold text-emerald-700">Voting is not open for you at this moment.</p>}
    </div>
  );

  const renderReflectionPanel = () => (
    <div className="mx-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-3 shadow-sm sm:mx-4">
      <p className="mb-3 text-sm font-black text-rose-800">How are you feeling right now? Pick one word.</p>
      <div className="flex max-h-[86px] flex-wrap gap-2 overflow-hidden sm:max-h-none" aria-label="Reflection word choices">
        {visibleReflectionOptions.slice(0, 12).map((choice) => {
          const isSelected = selectedModeOptionId === choice.id;
          const isSubmitting = submittingModeOptionId === choice.id;
          const canSelect = modeCanSubmit && !isPaused && !isSkipped && !isSubmitting;
          return <button key={choice.id} type="button" aria-pressed={isSelected} onClick={() => canSelect && void onWordPick?.(choice)} disabled={!canSelect} className={`session-control-button rounded-full border px-4 py-2 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${isSelected ? 'scale-105 border-rose-400 bg-white text-rose-900 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50'}`}>{isSubmitting ? 'Saving…' : choice.label}</button>;
        })}
      </div>
      {effectiveReflectionOptions.length > visibleReflectionOptions.length && <button type="button" onClick={() => setShowAllReflectionWords(true)} className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2">Show more <ChevronDown className="h-3.5 w-3.5" /></button>}
    </div>
  );

  const renderDebatePanel = () => (
    <div className="mx-3 rounded-2xl border border-red-200 bg-red-50/40 p-3 shadow-sm sm:mx-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={handleHandRaiseToggle} aria-pressed={handRaised || floorGranted} disabled={floorGranted} className={`session-control-button inline-flex h-12 w-fit items-center gap-2 rounded-2xl border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 active:scale-95 disabled:cursor-default motion-reduce:transition-none ${floorGranted ? 'border-emerald-300 bg-white text-emerald-800' : handRaised ? 'border-red-400 bg-white text-red-900 shadow-sm' : 'border-slate-200 bg-white text-slate-800 hover:border-red-300 hover:bg-red-50'}`}><Hand className="h-4 w-4" />{floorGranted ? 'Floor granted' : handRaised ? 'Hand raised' : 'Raise hand to speak'}</button>
        <div className="flex items-center gap-2"><span className="text-xs font-semibold text-slate-500">React:</span><QuickReactions onReaction={onReaction} compact={isMobile} /></div>
      </div>
    </div>
  );

  const renderModePanel = () => {
    if (!modeContext) return null;
    if (modeKey === 'voting_rating') return renderVotingPanel();
    if (modeKey === 'round_robin') return renderRoundRobinPanel();
    if (modeKey === 'silent_individual_response') return renderSilentResponsePanel();
    if (modeKey === 'reflection_checkin') return renderReflectionPanel();
    if (modeKey === 'debate') return renderDebatePanel();
    return renderOpenDiscussionPanel();
  };

  const shouldRenderDefaultChatInput = !modeContext && !isPaused && !isSkipped;

  return (
    <>
      {showResponseStats && <div className="px-2 py-1 border-t border-gray-100 bg-white"><Badge variant="outline" className="bg-gray-50 text-xs px-1.5 py-0.5"><Users className="w-3 h-3 mr-1" /><span>{totalResponses} of {participantCount} answered</span></Badge></div>}
      <div className="w-full flex-shrink-0 border-t border-gray-100 bg-white/95 backdrop-blur-sm" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {transitionNotice && <div className="mx-3 mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition-opacity duration-200 motion-reduce:transition-none sm:mx-4" role="status" aria-live="polite">{transitionNotice}</div>}
        {savedNotice && <div className="mx-3 mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:mx-4" role="status" aria-live="polite">{savedNotice}</div>}
        {isParticipantContext && hasReachedQuestionLimit ? (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center"><div className="mb-2 flex items-center justify-center gap-2 bg-amber-50 px-3 py-2 rounded-md text-amber-700 border border-amber-200 w-full text-sm"><Lock className="h-4 w-4" /><span className="font-medium">Question limit reached ({maxQuestionsPerSession} per session). <a href="/pricing" className="underline hover:text-amber-900">Upgrade your plan</a> for more.</span></div></div>
        ) : isParticipantContext ? (
          <div className="max-h-[260px] overflow-y-auto overscroll-contain pb-2 md:max-h-none md:overflow-visible">
            {renderStageHeader()}<div className={`transition-opacity duration-200 motion-reduce:transition-none ${isPanelFading ? 'opacity-0' : 'opacity-100'}`}>{renderModePanel()}</div>
            {modeInputError && <p className="mx-3 mt-2 text-xs font-semibold text-rose-600 sm:mx-4">{modeInputError}</p>}
            <ParticipantEngagementControls status={status} onSkip={skipQuestion} onTogglePause={togglePause} onSendHostMessage={sendMessageToHost} isSendingHostMessage={isSendingHostMessage} hostMessageSent={hostMessageSent} hasAnswered={hasAnswered} isMobile={isMobile} />
            {shouldRenderDefaultChatInput && <ChatInput inputMessage={inputMessage} setInputMessage={setInputMessage} onSendMessage={onSendMessage} isRecording={isRecording} setIsRecording={setIsRecording} placeholder={!shouldAllowAnswer && disabledPlaceholder ? disabledPlaceholder : placeholder} disabled={!shouldAllowAnswer} isMobile={isMobile} speechEnabled={speechEnabled} speechLanguage={speechLanguage} onSpeechInterim={onSpeechInterim} onSpeechFinal={onSpeechFinal} />}
            {!modeContext && !isPaused && !isSkipped && <div className="px-3 pb-2 sm:px-4"><QuickReactions onReaction={onReaction} compact={isMobile} /></div>}
          </div>
        ) : (
          <div className="p-3 sm:p-4 flex flex-col items-center justify-center"><div className="mb-2 flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-md text-green-700 border border-green-200 w-full text-sm"><span className="font-medium">Your answer has been submitted</span></div><p className="text-xs text-gray-500">Waiting for other participants to respond…</p></div>
        )}
      </div>
    </>
  );
};

export default InputFooter;
