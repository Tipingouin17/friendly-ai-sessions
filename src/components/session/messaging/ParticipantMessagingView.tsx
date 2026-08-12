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
import type { ConversationWithSession, DbFacilitatorPersonaConfig } from '@/types/database';
import type { UseStreamingFacilitatorRuntimeResult } from '@/hooks/facilitator/useStreamingFacilitatorRuntime';
import InputFooter from '@/components/session/InputFooter';
import { useMessageProcessor } from '@/hooks/useMessageProcessor';
import { Captions, CheckCircle2, Home, MessageSquare, Mic, MicOff, Sparkles, Users, Video, VideoOff } from 'lucide-react';
import FacilitatorAvatar from '@/components/chat/avatars/FacilitatorAvatar';
import { SessionVideoGrid, type SessionVideoParticipant } from '@/components/session/video/SessionVideoGrid';
import type { FacilitatorToolAssignment } from '@/types/facilitator';
import { hasTtsEventForMessage, recordSpeechTurn } from '@/services/facilitator/phase3RuntimeService';
import { useFacilitatorVoice } from '@/hooks/facilitator/useFacilitatorVoice';
import { usePhase3RuntimeSettings } from '@/hooks/facilitator/usePhase3RuntimeSettings';
import { inferFacilitatorVoiceGender } from '@/utils/facilitatorVoiceGender';
import { HOST_VIDEO_STREAM_KEY, useWebRTCSession, type WebRTCConnectionStatus, type WebRTCPeerStatus } from '@/hooks/useWebRTCSession';
import { updateModeParticipantState, type FacilitatorModeAssignment, type ModeInput, type ModeParticipantState, type SessionActiveMode, type SessionModeEvent } from '@/services/modeOrchestratorService';
import { persistParticipantMediaPreferences, readParticipantMediaPreferences } from '@/utils/participantMediaPreferences';
import { prepareFacilitatorSpeechText } from '@/utils/prepareFacilitatorSpeechText';

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
    participantId?: number;
    inputType: string;
    content: Record<string, unknown>;
    visibility?: ModeInput["visibility"];
  }) => Promise<unknown>;
}

type SidebarTab = 'people' | 'chat';
type TileConnectionStatus = NonNullable<SessionVideoParticipant['connectionStatus']>;

const getPeerTileConnectionStatus = (peerStatus: WebRTCPeerStatus | undefined, hasStream: boolean): TileConnectionStatus => {
  if (hasStream || peerStatus?.hasRemoteStream) return 'connected';
  if (!peerStatus) return 'connecting';
  if (peerStatus.connectionState === 'failed' || peerStatus.iceConnectionState === 'failed') return 'failed';
  if (peerStatus.connectionState === 'disconnected' || peerStatus.iceConnectionState === 'disconnected') return 'disconnected';
  if (peerStatus.connectionState === 'closed') return 'idle';
  return 'connecting';
};

const formatPeerTileStatusLabel = (status: TileConnectionStatus): string => {
  if (status === 'connected') return 'Live video';
  if (status === 'failed') return 'Reconnect needed';
  if (status === 'disconnected') return 'Reconnecting';
  if (status === 'unsupported') return 'Unsupported';
  if (status === 'idle') return 'Camera off';
  return 'Connecting';
};

const formatRoomConnectionLabel = (status: WebRTCConnectionStatus): string => {
  if (status === 'connected') return 'Room video connected';
  if (status === 'connecting') return 'Room video connecting';
  if (status === 'disconnected') return 'Room video reconnecting';
  if (status === 'failed') return 'Room video connection needs attention';
  if (status === 'unsupported') return 'Room video unsupported';
  return 'Room video idle';
};

const isGenericParticipantLabel = (value?: string | null): boolean => {
  const trimmedValue = value?.trim();
  return !trimmedValue || /^Participant\s+\d+(?:\s+\(You\))?$/i.test(trimmedValue) || /^P\d+$/i.test(trimmedValue);
};

const resolveStoredParticipantName = (
  participant: ParticipantInfo,
  participantNames: { [key: number]: string }
): string => {
  const participantName = participant.name?.trim();
  if (participantName && !isGenericParticipantLabel(participantName)) return participantName;

  const mappedName = participantNames[participant.id]?.trim();
  if (mappedName && !isGenericParticipantLabel(mappedName)) return mappedName;

  return participantName || mappedName || `Participant ${participant.id}`;
};

const formatNameInitials = (name: string | null | undefined, fallback = 'P'): string => {
  const initials = name
    ?.trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || fallback;
};

const formatParticipantInitials = (participant: ParticipantInfo): string => {
  const source = resolveStoredParticipantName(participant, {}) || `P${participant.id}`;
  return formatNameInitials(source, `P${participant.id}`.slice(0, 2).toUpperCase());
};

const isHostParticipant = (participant: ParticipantInfo): boolean => {
  return Boolean(participant.isHost || participant.isAdmin);
};

const resolveHostDisplayName = (hostParticipant: ParticipantInfo | null | undefined): string => {
  const explicitName = hostParticipant?.name?.trim();
  if (explicitName && !isGenericParticipantLabel(explicitName)) return explicitName;
  return 'Host';
};

const resolvePositiveParticipantId = (...candidates: Array<number | null | undefined>): number | null => {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) return candidate;
  }
  return null;
};

const getParticipantIdFromUrl = (): number | null => {
  if (typeof window === 'undefined') return null;
  const rawParticipantId = new URLSearchParams(window.location.search).get('participantId');
  if (!rawParticipantId) return null;
  const parsedParticipantId = Number(rawParticipantId);
  return Number.isFinite(parsedParticipantId) && parsedParticipantId > 0 ? parsedParticipantId : null;
};

const getAvatarSeedFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  const avatarSeed = new URLSearchParams(window.location.search).get('avatarSeed')?.trim();
  return avatarSeed || null;
};

type LegacyActiveModeFields = {
  name?: string | null;
  mode_key?: string | null;
  mode_slug?: string | null;
};

type LegacyEnabledModeFields = {
  name?: string | null;
  mode_slug?: string | null;
};

type ModeChoice = {
  id: string;
  label: string;
  description?: string;
  value: unknown;
};

const titleizeModeKey = (modeKey: string | null | undefined): string => {
  if (!modeKey) return 'Open Discussion';
  return modeKey
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

const stringifyModeChoice = (choice: unknown): string => {
  if (choice === null || choice === undefined) return '';
  if (typeof choice === 'string' || typeof choice === 'number' || typeof choice === 'boolean') return String(choice);
  if (typeof choice === 'object') {
    const record = choice as Record<string, unknown>;
    const label = record.label ?? record.title ?? record.name ?? record.choice ?? record.value ?? record.id;
    return stringifyModeChoice(label);
  }
  return '';
};

const normalizeModeChoices = (options: Record<string, unknown> | unknown): ModeChoice[] => {
  const optionRecord = options && typeof options === 'object' && !Array.isArray(options) ? options as Record<string, unknown> : null;
  const rawChoices = Array.isArray(options)
    ? options
    : [optionRecord?.choices, optionRecord?.options, optionRecord?.items, optionRecord?.vote_options]
      .find((candidate): candidate is unknown[] => Array.isArray(candidate));

  if (!rawChoices) return [];

  return rawChoices
    .map((choice, index) => {
      const label = stringifyModeChoice(choice).trim();
      if (!label) return null;
      const record = typeof choice === 'object' && choice !== null ? choice as Record<string, unknown> : null;
      const id = stringifyModeChoice(record?.id ?? record?.value ?? label).trim() || `${index}`;
      const description = stringifyModeChoice(record?.description ?? record?.help_text ?? record?.subtitle).trim() || undefined;
      return { id, label, description, value: choice } satisfies ModeChoice;
    })
    .filter((choice): choice is ModeChoice => Boolean(choice));
};

const normalizeFacilitationModeKey = (modeKey: string | null | undefined): string => {
  const normalized = (modeKey || 'open_discussion').trim().toLowerCase().replace(/-/g, '_');
  if (normalized === 'voting') return 'voting_rating';
  if (normalized === 'reflection') return 'reflection_checkin';
  if (normalized === 'silent_response') return 'silent_individual_response';
  return normalized;
};

const normalizeTechniqueKey = (value: string | null | undefined): string => {
  return (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
};

const inferModeKeyFromTechnique = (techniqueKey: string): string => {
  if (!techniqueKey) return 'open_discussion';
  if (techniqueKey.includes('vote') || techniqueKey.includes('priorit') || techniqueKey.includes('dot')) return 'voting_rating';
  if (techniqueKey.includes('round') || techniqueKey.includes('turn')) return 'round_robin';
  if (techniqueKey.includes('silent') || techniqueKey.includes('brainwrit') || techniqueKey.includes('individual')) return 'silent_individual_response';
  if (techniqueKey.includes('reflect') || techniqueKey.includes('checkin') || techniqueKey.includes('emotion') || techniqueKey.includes('temperature')) return 'reflection_checkin';
  return 'open_discussion';
};

const getParticipantModeInstruction = (modeKey: string, composerCopy?: string | null): string => {
  if (composerCopy?.trim()) return composerCopy.trim();
  if (modeKey === 'voting_rating') return 'Choose the option or signal that best represents your view.';
  if (modeKey === 'round_robin') return 'The facilitator is guiding participants through turns.';
  if (modeKey === 'reflection_checkin') return 'Choose a quick signal or write a short check-in so the facilitator can sense the room.';
  if (modeKey === 'silent_individual_response') return 'Take a quiet moment to write privately before the group continues.';
  if (modeKey === 'open_discussion') return 'You are live — speak freely or add written context when useful.';
  return 'Share your response when you are ready.';
};

const getModePlaceholder = (modeKey: string, composerCopy?: string | null): string => {
  if (composerCopy?.trim()) return composerCopy.trim();
  if (modeKey === 'round_robin') return 'Your turn will open when the facilitator calls on you…';
  if (modeKey === 'reflection_checkin') return 'Add a quick check-in or one-word reflection…';
  if (modeKey === 'silent_individual_response') return 'Write your private response…';
  if (modeKey === 'voting_rating') return 'Add optional context for your vote…';
  if (modeKey === 'open_discussion') return 'Add a thought to the live discussion…';
  return 'Type your response…';
};

const formatRemainingTime = (seconds: number | null | undefined): string | null => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return null;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getFacilitatorPersonaConfig = (
  rawPersonaConfig?: DbFacilitatorPersonaConfig | DbFacilitatorPersonaConfig[] | null
): DbFacilitatorPersonaConfig | null => {
  if (Array.isArray(rawPersonaConfig)) return rawPersonaConfig[0] ?? null;
  return rawPersonaConfig ?? null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
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
  const [audioUnlocked, setAudioUnlocked] = React.useState(() => {
    // Persist across re-renders within the same browser tab session
    try { return sessionStorage.getItem('mf_audio_unlocked') === '1'; } catch { return false; }
  });
  const handleUnlockAudio = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) { const ctx = new AudioCtx(); void ctx.resume(); }
    } catch (_) { /* ignore */ }
    try { sessionStorage.setItem('mf_audio_unlocked', '1'); } catch { /* ignore */ }
    setAudioUnlocked(true);
  }, []);
  const [localCameraStream, setLocalCameraStream] = React.useState<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = React.useState<'off' | 'starting' | 'on' | 'blocked' | 'unsupported'>('off');
  const [microphoneEnabled, setMicrophoneEnabled] = React.useState(false);
  const [, setCameraError] = React.useState<string | null>(null);
  const [submittingChoiceId, setSubmittingChoiceId] = React.useState<string | null>(null);
  const [localDebateHandRaised, setLocalDebateHandRaised] = React.useState(false);
  const [submittedChoiceId, setSubmittedChoiceId] = React.useState<string | null>(null);
  const [modeInputError, setModeInputError] = React.useState<string | null>(null);
  const localCameraStreamRef = React.useRef<MediaStream | null>(null);
  const localCameraStartPromiseRef = React.useRef<Promise<MediaStream | null> | null>(null);
  const localCameraRequestIdRef = React.useRef(0);
  const autoCameraRestoreKeyRef = React.useRef<string | null>(null);
  const isSessionEnded = conversationData?.is_session_ended || conversationData?.status === 'completed';
  const activeParticipants = React.useMemo(() => {
    if (participants.length > 0) {
      return participants.map((participant) => ({
        ...participant,
        name: isHostParticipant(participant)
          ? resolveHostDisplayName(participant)
          : resolveStoredParticipantName(participant, participantNames),
      }));
    }

    return Array.from({ length: currentParticipantCount }, (_, index) => {
      const participantId = index + 1;
      return {
        id: participantId,
        name: participantNames[participantId]?.trim() || `Participant ${participantId}`,
      } as ParticipantInfo;
    });
  }, [currentParticipantCount, participantNames, participants]);
  const hostParticipant = React.useMemo(
    () => activeParticipants.find(isHostParticipant) ?? null,
    [activeParticipants]
  );
  const participantPeers = React.useMemo(
    () => activeParticipants.filter((participant) => !isHostParticipant(participant)),
    [activeParticipants]
  );
  const effectiveParticipantId = React.useMemo(() => {
    const urlParticipantId = getParticipantIdFromUrl();
    const firstKnownParticipantId = participantPeers.length === 1 ? participantPeers[0]?.id : null;
    return resolvePositiveParticipantId(currentUserParticipantId, currentParticipant, urlParticipantId, firstKnownParticipantId) ?? 1;
  }, [currentParticipant, currentUserParticipantId, participantPeers]);
  const currentParticipantAvatarSeed = React.useMemo(() => getAvatarSeedFromUrl(), []);

  const persistedMediaPreferences = React.useMemo(
    () => readParticipantMediaPreferences(conversationId),
    [conversationId]
  );

  const persistMediaPreferences = React.useCallback((cameraEnabled: boolean, micEnabled: boolean) => {
    persistParticipantMediaPreferences(conversationId, {
      cameraEnabled,
      microphoneEnabled: micEnabled,
    });
  }, [conversationId]);

  const filteredMessages = useMessageProcessor({
    messages,
    viewMode: "participant",
    participants: participantPeers,
    participantNames,
    currentParticipant: effectiveParticipantId
  });

  const sessionTitle = conversationData?.sessions?.title || 'Session';
  const facilitatorTitle = conversationData?.sessions?.facilitator_details?.title;
  const facilitatorName = facilitatorTitle || 'Facilitator';
  const facilitatorAvatarUrl = conversationData?.sessions?.facilitator_details?.profile_picture || null;
  const facilitatorDetails = conversationData?.sessions?.facilitator_details;
  const facilitatorId = facilitatorDetails?.id ?? null;
  const facilitatorPersonaConfig = React.useMemo(
    () => getFacilitatorPersonaConfig(facilitatorDetails?.persona_config),
    [facilitatorDetails?.persona_config]
  );
  const personaSpeakingBehavior = React.useMemo(
    () => asRecord(facilitatorPersonaConfig?.speaking_behavior),
    [facilitatorPersonaConfig?.speaking_behavior]
  );
  const personaGenderPresentation = facilitatorPersonaConfig?.gender_presentation?.toLowerCase() ?? '';
  const facilitatorVoiceGender = React.useMemo(() => {
    if (personaGenderPresentation.includes('feminine')) return 'female';
    if (personaGenderPresentation.includes('masculine')) return 'male';
    return inferFacilitatorVoiceGender({
      title: facilitatorDetails?.title ?? facilitatorName,
      details: facilitatorDetails?.details,
      description: facilitatorDetails?.description,
      profilePicture: facilitatorDetails?.profile_picture ?? facilitatorAvatarUrl,
    });
  }, [facilitatorAvatarUrl, facilitatorDetails?.description, facilitatorDetails?.details, facilitatorDetails?.profile_picture, facilitatorDetails?.title, facilitatorName, personaGenderPresentation]);
  const { data: phase3Settings, isPlaceholderData: isPhase3SettingsPending } = usePhase3RuntimeSettings(conversationData?.language);
  const phase3RuntimeReady = !isPhase3SettingsPending;
  const speechStackEnabled = Boolean(phase3RuntimeReady && phase3Settings?.speech_stack_enabled);
  const ttsAvatarEnabled = Boolean(phase3RuntimeReady && phase3Settings?.tts_avatar_enabled);
  const analyticsPersistenceEnabled = Boolean(phase3RuntimeReady && phase3Settings?.facilitation_analytics_enabled);
  const voiceRuntime = useFacilitatorVoice({
    conversationId,
    facilitatorId,
    enabled: viewMode === 'participant' && ttsAvatarEnabled && audioUnlocked,
    defaultVoiceId: facilitatorPersonaConfig?.voice_id ?? phase3Settings?.tts_default_voice_id ?? null,
    voiceGender: facilitatorVoiceGender,
    lipSyncEnabled: phase3Settings?.tts_lip_sync_enabled ?? true,
    persistEvents: analyticsPersistenceEnabled,
    voiceProvider: facilitatorPersonaConfig?.voice_provider ?? null,
    voiceStyle: facilitatorPersonaConfig?.voice_style ?? null,
    locale: facilitatorPersonaConfig?.locale ?? phase3Settings?.speech_default_language ?? conversationData?.language ?? null,
    speakingBehavior: personaSpeakingBehavior,
    animationPreset: facilitatorPersonaConfig?.animation_preset ?? null,
    // Force ElevenLabs server TTS via Railway backend
    ttsProvider: 'server',
    ttsEndpoint: `${import.meta.env.VITE_API_URL ?? ''}/api/tts/synthesize`,
  });
  const runtimeAvatarState = voiceRuntime.isSpeaking
    ? voiceRuntime.runtimeAvatarState
    : facilitatorRuntime?.avatarState ?? null;
  const showRuntimeAvatarState = Boolean((facilitatorRuntime?.enabled && runtimeAvatarState) || voiceRuntime.isSpeaking);
  const aiIsSpeaking = Boolean(voiceRuntime.isSpeaking || runtimeAvatarState?.state === 'speaking');
  const legacyActiveMode = activeMode as (SessionActiveMode & LegacyActiveModeFields) | null;
  const rawModeKey = activeMode?.facilitation_mode?.mode_key
    ?? legacyActiveMode?.mode_key
    ?? legacyActiveMode?.mode_slug
    ?? 'open_discussion';
  const modeKey = normalizeFacilitationModeKey(rawModeKey);
  const enabledModeDefinition = enabledModes.find((mode) => {
    const legacyMode = mode as FacilitatorModeAssignment & LegacyEnabledModeFields;
    return normalizeFacilitationModeKey(mode.mode_key) === modeKey || normalizeFacilitationModeKey(legacyMode.mode_slug) === modeKey;
  });
  const modeLabel = activeMode?.facilitation_mode?.display_name
    ?? legacyActiveMode?.name
    ?? enabledModeDefinition?.display_name
    ?? (enabledModeDefinition as (FacilitatorModeAssignment & LegacyEnabledModeFields) | undefined)?.name
    ?? titleizeModeKey(modeKey);
  const modeComposerCopy = activeMode?.facilitation_mode?.composer_copy ?? null;
  const modeInstruction = getParticipantModeInstruction(modeKey, modeComposerCopy);
  const modePlaceholder = getModePlaceholder(modeKey, modeComposerCopy);
  const modeChoices = React.useMemo(() => normalizeModeChoices(activeMode?.options ?? {}), [activeMode?.options]);
  const remainingTimeLabel = formatRemainingTime(participantModeState?.remaining_time);
  const modeCanSubmit = participantModeState?.can_submit ?? true;
  const modeComposerComponent = activeMode?.composer_component ?? activeMode?.facilitation_mode?.composer_component ?? null;
  const latestAssistantMessage = React.useMemo(() => {
    return [...messages].reverse().find((message) => message.sender === 'assistant') ?? null;
  }, [messages]);
  const lastFacilitationTechnique = latestAssistantMessage?.facilitationTechnique ?? null;
  const selectedTechniqueKey = lastFacilitationTechnique?.selected
    || lastFacilitationTechnique?.selected_technique
    || lastFacilitationTechnique?.label
    || lastFacilitationTechnique?.display_name
    || null;
  const techniqueDisplayLabel = lastFacilitationTechnique?.label
    || lastFacilitationTechnique?.display_name
    || lastFacilitationTechnique?.selected
    || lastFacilitationTechnique?.selected_technique
    || null;
  const techniqueModeKey = React.useMemo(() => {
    return inferModeKeyFromTechnique(normalizeTechniqueKey(selectedTechniqueKey));
  }, [selectedTechniqueKey]);
  const techniqueModeContext = React.useMemo(() => {
    if (!lastFacilitationTechnique || activeMode) return null;
    const label = techniqueDisplayLabel || titleizeModeKey(techniqueModeKey);
    const instruction = lastFacilitationTechnique.expected_participant_input
      || lastFacilitationTechnique.steering_instruction
      || lastFacilitationTechnique.divergence_guidance
      || lastFacilitationTechnique.prompt
      || getParticipantModeInstruction(techniqueModeKey, null);
    return { label, instruction, modeKey: techniqueModeKey };
  }, [activeMode, lastFacilitationTechnique, techniqueDisplayLabel, techniqueModeKey]);
  const effectiveModeKey = techniqueModeContext && !activeMode ? techniqueModeContext.modeKey : modeKey;
  const effectiveModeLabel = techniqueModeContext && !activeMode ? techniqueModeContext.label : modeLabel;
  const effectiveModeInstruction = techniqueModeContext && !activeMode ? techniqueModeContext.instruction : modeInstruction;
  const effectiveModePlaceholder = techniqueModeContext && !activeMode ? getModePlaceholder(techniqueModeContext.modeKey, techniqueModeContext.instruction) : modePlaceholder;
  const isVotingMode = effectiveModeKey === 'voting_rating';
  const isRoundRobinMode = effectiveModeKey === 'round_robin';
  const isSilentResponseMode = effectiveModeKey === 'silent_individual_response';
  const isReflectionMode = effectiveModeKey === 'reflection_checkin';
  const isOpenDiscussionMode = effectiveModeKey === 'open_discussion';
  const modeBlocksAfterResponse = isVotingMode || isRoundRobinMode || isSilentResponseMode || isReflectionMode;
  const resolveParticipantDisplayName = React.useCallback((participantId: number | string | null | undefined, fallbackName?: string | null): string => {
    const numericParticipantId = Number(participantId);
    const participant = Number.isFinite(numericParticipantId)
      ? participantPeers.find((candidate) => candidate.id === numericParticipantId)
      : undefined;

    if (participant) return resolveStoredParticipantName(participant, participantNames);

    const mappedName = Number.isFinite(numericParticipantId) ? participantNames[numericParticipantId]?.trim() : undefined;
    if (mappedName && !isGenericParticipantLabel(mappedName)) return mappedName;

    const cleanedFallback = fallbackName?.trim();
    if (cleanedFallback && !isGenericParticipantLabel(cleanedFallback) && cleanedFallback !== 'You') return cleanedFallback;

    return Number.isFinite(numericParticipantId) && numericParticipantId > 0 ? `Participant ${numericParticipantId}` : 'Participant';
  }, [participantPeers, participantNames]);

  const latestParticipantMessages = React.useMemo(() => {
    return [...messages]
      .filter((message) => message.sender !== 'assistant' && !message.isPrivateToHost)
      .slice(-12);
  }, [messages]);
  const latestOwnParticipantMessage = React.useMemo(() => {
    const participantKey = String(effectiveParticipantId);
    const latestAssistantIndex = filteredMessages.map((message) => message.sender).lastIndexOf('assistant');
    const responseWindow = latestAssistantIndex >= 0 ? filteredMessages.slice(latestAssistantIndex + 1) : filteredMessages;

    return [...responseWindow]
      .reverse()
      .find((message) => message.sender === 'user' && (effectiveParticipantId === 0 || String(message.participant) === participantKey)) ?? null;
  }, [effectiveParticipantId, filteredMessages]);
  const hasSubmittedModeChoice = Boolean(submittedChoiceId);
  const modeState = participantModeState?.state as Record<string, unknown> | null | undefined;

  React.useEffect(() => {
    setLocalDebateHandRaised(Boolean(modeState?.hand_raised));
  }, [activeMode?.id, modeState?.hand_raised]);
  const modeStateSubmitted = Boolean(modeState?.submitted);
  const modeResponsePreview = React.useMemo(() => {
    const content = modeState?.content;
    if (!content || typeof content !== 'object' || Array.isArray(content)) return null;
    const record = content as Record<string, unknown>;
    const candidate = record.text ?? record.choice ?? record.value ?? record.transcript;
    return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
  }, [modeState]);
  // Chat responses belong to the open discussion only. Structured modes retain
  // their own completion state so a previous turn cannot disable the next mode.
  const hasRegisteredResponse = isOpenDiscussionMode
    ? Boolean(hasAnswered || latestOwnParticipantMessage)
    : Boolean(modeStateSubmitted || hasSubmittedModeChoice);
  const participantResponseTotal = participantPeers.length > 0 ? participantPeers.length : Math.max(currentParticipantCount, participants.length, 0);
  const responseTotal = Math.max(totalParticipants, participantResponseTotal, 1);
  const effectiveResponseCount = Math.min(responseTotal, Math.max(isOpenDiscussionMode ? responseCount : 0, hasRegisteredResponse ? 1 : 0));
  const responseProgress = Math.min(100, Math.round((effectiveResponseCount / responseTotal) * 100));
  const modeComposerDisabled = Boolean((activeMode || techniqueModeContext) && (!modeCanSubmit || (modeBlocksAfterResponse && (hasRegisteredResponse || hasSubmittedModeChoice)) || (isRoundRobinMode && !participantModeState?.is_current_speaker)));
  const handleSubmitModeChoice = React.useCallback(async (choice: ModeChoice, inputType: 'vote' | 'reflection_word' = 'vote') => {
    if (!submitModeInput || !modeCanSubmit || hasRegisteredResponse || submittingChoiceId) return;
    setModeInputError(null);
    setSubmittingChoiceId(choice.id);
    try {
      await submitModeInput({
        participantId: effectiveParticipantId,
        inputType,
        content: {
          choice: choice.label,
          value: choice.value,
          modeKey: effectiveModeKey,
        },
        visibility: inputType === 'vote' ? 'anonymous_aggregate' : 'private',
      });
      setSubmittedChoiceId(choice.id);
    } catch (error) {
      console.error('Failed to submit mode choice:', error);
      setModeInputError('We could not submit that choice. Please try again.');
    } finally {
      setSubmittingChoiceId(null);
    }
  }, [effectiveModeKey, hasRegisteredResponse, modeCanSubmit, submitModeInput, submittingChoiceId]);

  const handleModeAwareTextSubmit = React.useCallback(async () => {
    const text = inputMessage.trim();
    const shouldUseModePipeline = Boolean(activeMode && submitModeInput && !isOpenDiscussionMode);

    if (!shouldUseModePipeline) {
      onSendMessage();
      return;
    }

    const participantHasFloor = !isRoundRobinMode || Boolean(participantModeState?.is_current_speaker);
    const alreadySubmitted = modeBlocksAfterResponse && (hasRegisteredResponse || hasSubmittedModeChoice);
    if (!text || !modeCanSubmit || !participantHasFloor || alreadySubmitted || submittingChoiceId) return;

    setModeInputError(null);
    setSubmittingChoiceId('text-response');
    try {
      await submitModeInput({
        participantId: effectiveParticipantId,
        inputType: 'text_response',
        content: {
          text,
          modeKey: effectiveModeKey,
          source: 'participant_text_composer',
        },
        visibility: isSilentResponseMode ? 'private_until_synthesis' : 'attributed',
      });
      setSubmittedChoiceId('text-response');
      setInputMessage('');
    } catch (error) {
      console.error('Failed to submit mode text response:', error);
      setModeInputError('We could not submit that response. Please try again.');
    } finally {
      setSubmittingChoiceId(null);
    }
  }, [activeMode, effectiveModeKey, hasRegisteredResponse, hasSubmittedModeChoice, inputMessage, isOpenDiscussionMode, isRoundRobinMode, isSilentResponseMode, modeBlocksAfterResponse, modeCanSubmit, onSendMessage, participantModeState?.is_current_speaker, setInputMessage, submitModeInput, submittingChoiceId]);

  React.useEffect(() => {
    setSubmittedChoiceId(null);
    setModeInputError(null);
  }, [activeMode?.id]);
  const stopLocalCamera = React.useCallback(() => {
    localCameraRequestIdRef.current += 1;
    localCameraStartPromiseRef.current = null;

    const currentStream = localCameraStreamRef.current;
    if (!currentStream) {
      setLocalCameraStream(null);
      setCameraStatus('off');
      persistMediaPreferences(false, false);
      return;
    }

    currentStream.getVideoTracks().forEach((track) => {
      track.enabled = false;
      track.stop();
      currentStream.removeTrack(track);
    });

    const remainingTracks = currentStream.getTracks().filter((track) => track.readyState !== 'ended');
    const hasActiveAudioTrack = remainingTracks.some((track) => track.kind === 'audio');

    if (remainingTracks.length > 0) {
      const audioOnlyStream = new MediaStream(remainingTracks);
      localCameraStreamRef.current = audioOnlyStream;
      setLocalCameraStream(audioOnlyStream);
    } else {
      localCameraStreamRef.current = null;
      setLocalCameraStream(null);
    }

    setCameraStatus('off');
    setMicrophoneEnabled(hasActiveAudioTrack);
    persistMediaPreferences(false, hasActiveAudioTrack);
  }, [persistMediaPreferences]);

  const startLocalCamera = React.useCallback(async () => {
    const currentStream = localCameraStreamRef.current;
    const hasVideoTrack = currentStream?.getVideoTracks().some((track) => track.readyState !== 'ended');
    if (currentStream && hasVideoTrack) {
      setCameraStatus('on');
      return currentStream;
    }
    if (localCameraStartPromiseRef.current) return localCameraStartPromiseRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setCameraError('Camera preview is not supported in this browser.');
      return null;
    }

    const requestId = localCameraRequestIdRef.current + 1;
    localCameraRequestIdRef.current = requestId;
    setCameraStatus('starting');
    setCameraError(null);

    const shouldEnableMicrophone = microphoneEnabled || readParticipantMediaPreferences(conversationId).microphoneEnabled;
    const cameraStartPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
      audio: shouldEnableMicrophone,
    }).then((stream) => {
      if (localCameraRequestIdRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }

      if (localCameraStreamRef.current && localCameraStreamRef.current !== stream) {
        localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      localCameraStreamRef.current = stream;
      setLocalCameraStream(stream);
      setCameraStatus('on');
      const hasAudioTrack = stream.getAudioTracks().some((track) => track.enabled);
      setMicrophoneEnabled(hasAudioTrack);
      persistMediaPreferences(true, hasAudioTrack);
      return stream;
    }).catch((error) => {
      if (localCameraRequestIdRef.current !== requestId) return null;
      console.error('Error accessing participant camera:', error);
      setLocalCameraStream(null);
      localCameraStreamRef.current = null;
      setCameraStatus('blocked');
      setCameraError('Camera access was blocked. Allow camera permission in your browser to show your preview.');
      return null;
    }).finally(() => {
      if (localCameraStartPromiseRef.current === cameraStartPromise) {
        localCameraStartPromiseRef.current = null;
      }
    });

    localCameraStartPromiseRef.current = cameraStartPromise;
    return cameraStartPromise;
  }, [conversationId, microphoneEnabled, persistMediaPreferences]);

  const toggleLocalCamera = React.useCallback(() => {
    const currentStream = localCameraStreamRef.current;
    const hasVideoTrack = currentStream?.getVideoTracks().some((track) => track.readyState !== 'ended');

    if (currentStream && hasVideoTrack) {
      stopLocalCamera();
      return;
    }

    if (localCameraStartPromiseRef.current) return;
    void startLocalCamera();
  }, [startLocalCamera, stopLocalCamera]);

  const startLocalMicrophone = React.useCallback(async (options: { persistPreference?: boolean } = {}) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Microphone testing is not supported in this browser.');
      if (options.persistPreference !== false) {
        const hasActiveVideoTrack = localCameraStreamRef.current?.getVideoTracks().some((track) => track.readyState !== 'ended') ?? false;
        persistMediaPreferences(hasActiveVideoTrack || cameraStatus === 'on', false);
      }
      return false;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      const audioTrack = audioStream.getAudioTracks()[0];
      if (!audioTrack) {
        setCameraError('No microphone was detected.');
        if (options.persistPreference !== false) {
          const hasActiveVideoTrack = localCameraStreamRef.current?.getVideoTracks().some((track) => track.readyState !== 'ended') ?? false;
          persistMediaPreferences(hasActiveVideoTrack || cameraStatus === 'on', false);
        }
        return false;
      }

      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = false;
          track.stop();
          localCameraStreamRef.current?.removeTrack(track);
        });
        localCameraStreamRef.current.addTrack(audioTrack);
        setLocalCameraStream(new MediaStream(localCameraStreamRef.current.getTracks()));
      } else {
        const audioOnlyStream = new MediaStream([audioTrack]);
        localCameraStreamRef.current = audioOnlyStream;
        setLocalCameraStream(audioOnlyStream);
      }

      setMicrophoneEnabled(true);
      if (options.persistPreference !== false) {
        const hasActiveVideoTrack = localCameraStreamRef.current?.getVideoTracks().some((track) => track.readyState !== 'ended') ?? false;
        persistMediaPreferences(hasActiveVideoTrack || cameraStatus === 'on', true);
      }
      return true;
    } catch (error) {
      console.error('Error accessing participant microphone:', error);
      setCameraError('Microphone access was blocked. Allow microphone permission in your browser to use audio.');
      setMicrophoneEnabled(false);
      if (options.persistPreference !== false) {
        const hasActiveVideoTrack = localCameraStreamRef.current?.getVideoTracks().some((track) => track.readyState !== 'ended') ?? false;
        persistMediaPreferences(hasActiveVideoTrack || cameraStatus === 'on', false);
      }
      return false;
    }
  }, [cameraStatus, persistMediaPreferences]);

  React.useEffect(() => {
    if (!conversationId || isSessionEnded || localCameraStreamRef.current || localCameraStartPromiseRef.current) return;
    if (autoCameraRestoreKeyRef.current === String(conversationId)) return;

    if (persistedMediaPreferences.cameraEnabled) {
      autoCameraRestoreKeyRef.current = String(conversationId);
      void startLocalCamera();
      return;
    }

    if (persistedMediaPreferences.microphoneEnabled) {
      autoCameraRestoreKeyRef.current = String(conversationId);
      void startLocalMicrophone({ persistPreference: false });
      return;
    }

    setMicrophoneEnabled(false);
  }, [conversationId, isSessionEnded, persistedMediaPreferences.cameraEnabled, persistedMediaPreferences.microphoneEnabled, startLocalCamera, startLocalMicrophone]);

  const toggleLocalMicrophone = React.useCallback(async () => {
    const nextMicrophoneEnabled = !microphoneEnabled;

    if (!nextMicrophoneEnabled) {
      localCameraStreamRef.current?.getAudioTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
        localCameraStreamRef.current?.removeTrack(track);
      });
      setMicrophoneEnabled(false);
      persistMediaPreferences(cameraStatus === 'on', false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Microphone testing is not supported in this browser.');
      persistMediaPreferences(cameraStatus === 'on', false);
      return;
    }

    await startLocalMicrophone();
  }, [cameraStatus, microphoneEnabled, persistMediaPreferences, startLocalMicrophone]);

  const handleToggleLocalCameraClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    toggleLocalCamera();
  }, [toggleLocalCamera]);

  const handleToggleLocalMicrophoneClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void toggleLocalMicrophone();
  }, [toggleLocalMicrophone]);

  React.useEffect(() => {
    return () => {
      localCameraRequestIdRef.current += 1;
      localCameraStartPromiseRef.current = null;
      if (localCameraStreamRef.current) {
        localCameraStreamRef.current.getTracks().forEach((track) => track.stop());
        localCameraStreamRef.current = null;
      }
    };
  }, []);

  const resolveParticipantVideoAvatarSeed = React.useCallback((participant: ParticipantInfo): string | null => {
    if (participant.avatarSeed?.trim()) return participant.avatarSeed.trim();
    if (participant.id === effectiveParticipantId && currentParticipantAvatarSeed) return currentParticipantAvatarSeed;
    return null;
  }, [currentParticipantAvatarSeed, effectiveParticipantId]);

  const currentParticipantVideoRecord = React.useMemo<ParticipantInfo>(() => {
    const knownParticipant = participantPeers.find((participant) => participant.id === effectiveParticipantId);
    if (knownParticipant) return knownParticipant;

    const mappedName = participantNames[effectiveParticipantId]?.trim();
    return {
      id: effectiveParticipantId,
      name: mappedName && !isGenericParticipantLabel(mappedName) ? mappedName : `Participant ${effectiveParticipantId}`,
      avatarSeed: currentParticipantAvatarSeed || undefined,
    } as ParticipantInfo;
  }, [currentParticipantAvatarSeed, effectiveParticipantId, participantNames, participantPeers]);

  const orderedVideoParticipants = React.useMemo(() => {
    const participantById = new Map<number, ParticipantInfo>();
    participantById.set(currentParticipantVideoRecord.id, currentParticipantVideoRecord);
    participantPeers.forEach((participant) => participantById.set(participant.id, participant));

    return Array.from(participantById.values()).sort((first, second) => {
      if (first.id === effectiveParticipantId) return -1;
      if (second.id === effectiveParticipantId) return 1;
      return first.id - second.id;
    });
  }, [currentParticipantVideoRecord, effectiveParticipantId, participantPeers]);
  const { remoteStreams, connectionStatus, peerStatuses } = useWebRTCSession({
    conversationId,
    role: 'participant',
    participantId: effectiveParticipantId,
    participants: participantPeers,
    localStream: localCameraStream,
    enabled: !isSessionEnded,
  });
  const roomConnectionLabel = formatRoomConnectionLabel(connectionStatus);
  const hostRemoteStream = remoteStreams[HOST_VIDEO_STREAM_KEY] ?? null;
  const hostPeerStatus = peerStatuses[HOST_VIDEO_STREAM_KEY];
  const hostTileConnectionStatus = getPeerTileConnectionStatus(hostPeerStatus, Boolean(hostRemoteStream));
  const hostDisplayName = resolveHostDisplayName(hostParticipant);
  const facilitatorVideoTile: SessionVideoParticipant = {
    id: 'ai-facilitator',
    name: facilitatorName || 'AI Facilitator',
    initials: formatNameInitials(facilitatorName, 'AI'),
    avatarUrl: facilitatorAvatarUrl || undefined,
    isAI: true,
    isMuted: false,
    isSpeaking: aiIsSpeaking,
    connectionStatusLabel: aiIsSpeaking ? 'AI speaking' : undefined,
    accentColor: 'rgb(245 158 11)',
  };

  const hostVideoTile: SessionVideoParticipant = {
    id: HOST_VIDEO_STREAM_KEY,
    name: hostDisplayName,
    initials: formatNameInitials(hostDisplayName, 'H'),
    avatarUrl: hostParticipant?.avatar || undefined,
    avatarSeed: hostParticipant?.avatarSeed || undefined,
    mediaStream: hostRemoteStream,
    isMuted: false,
    isSpeaking: Boolean(hostRemoteStream),
    connectionStatus: hostTileConnectionStatus,
    connectionStatusLabel: formatPeerTileStatusLabel(hostTileConnectionStatus),
    accentColor: 'rgb(217 119 6)',
  };

  const participantVideoTiles: SessionVideoParticipant[] = [facilitatorVideoTile, hostVideoTile, ...orderedVideoParticipants.map((participant) => {
    const isCurrentUser = participant.id === effectiveParticipantId;
    const remoteStream = remoteStreams[String(participant.id)] ?? null;
    const peerStatus = peerStatuses[`participant-${participant.id}`];
    const tileConnectionStatus = isCurrentUser ? undefined : getPeerTileConnectionStatus(peerStatus, Boolean(remoteStream));

    return {
      id: String(participant.id),
      name: resolveParticipantDisplayName(participant.id, participant.name),
      initials: formatParticipantInitials(participant),
      avatarUrl: participant.avatar,
      avatarSeed: resolveParticipantVideoAvatarSeed(participant),
      accentColor: participantColors[String(participant.id)] || undefined,
      mediaStream: isCurrentUser ? localCameraStream : remoteStream,
      isYou: isCurrentUser,
      isMuted: !isCurrentUser || !microphoneEnabled,
      isSpeaking: isCurrentUser && microphoneEnabled,
      connectionStatus: tileConnectionStatus,
      connectionStatusLabel: isCurrentUser ? (microphoneEnabled ? 'Mic on' : 'Muted') : tileConnectionStatus ? formatPeerTileStatusLabel(tileConnectionStatus) : undefined,
    };
  })];
  const cameraIsOn = cameraStatus === 'on' && Boolean(localCameraStream?.getVideoTracks().some((track) => track.readyState !== 'ended'));
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
  const lastAssistantMessage = latestAssistantMessage;

  React.useEffect(() => {
    if (!phase3RuntimeReady || !ttsAvatarEnabled || !lastAssistantMessage || !conversationId) return;
    const messageId = String(lastAssistantMessage.id);
    const browserReplayKey = `facilitator-tts-spoken:${conversationId}:${messageId}`;
    if (lastSpokenAssistantMessageRef.current === messageId) return;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(browserReplayKey) === '1') {
      lastSpokenAssistantMessageRef.current = messageId;
      return;
    }

    let cancelled = false;
    const maybeSpeakLatestAssistantMessage = async () => {
      if (analyticsPersistenceEnabled) {
        try {
          const alreadySpoken = await hasTtsEventForMessage(conversationId, messageId);
          if (cancelled) return;
          if (alreadySpoken) {
            lastSpokenAssistantMessageRef.current = messageId;
            if (typeof window !== 'undefined') window.sessionStorage.setItem(browserReplayKey, '1');
            return;
          }
        } catch (error) {
          console.warn('Unable to verify facilitator TTS replay state; using browser-session guard.', error);
        }
      }

      lastSpokenAssistantMessageRef.current = messageId;
      if (typeof window !== 'undefined') window.sessionStorage.setItem(browserReplayKey, '1');
      const spokenText = prepareFacilitatorSpeechText(lastAssistantMessage.content);
      void voiceRuntime.speak({
        text: spokenText || lastAssistantMessage.content,
        messageId,
        metadata: { source: 'participant_messaging_view' },
      });
    };

    void maybeSpeakLatestAssistantMessage();
    return () => {
      cancelled = true;
    };
  }, [analyticsPersistenceEnabled, conversationId, lastAssistantMessage, phase3RuntimeReady, ttsAvatarEnabled, voiceRuntime]);

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

    if (isOpenDiscussionMode && submitModeInput) {
      void submitModeInput({
        participantId: effectiveParticipantId,
        inputType: 'voice_transcript',
        content: {
          transcript: payload.transcript,
          confidence: payload.confidence,
          modeKey: effectiveModeKey,
          startedAt: payload.startedAt,
          endedAt: payload.endedAt,
          durationMs: payload.durationMs,
          source: 'browser_speech_recognition',
        },
        visibility: 'attributed',
      }).catch((error) => {
        console.warn('Unable to submit Open Discussion speech turn to mode pipeline:', error);
      });
    }

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
      metrics: {
        composer: isOpenDiscussionMode ? 'open_discussion_live_listening' : 'participant_chat_input',
        modeKey: effectiveModeKey,
        activeModeId: activeMode?.id ?? null,
      },
    });
  }, [activeMode?.id, analyticsPersistenceEnabled, conversationData?.language, conversationId, effectiveModeKey, effectiveParticipantId, facilitatorId, facilitatorRuntime, isOpenDiscussionMode, phase3Settings?.speech_default_language, speechStackEnabled, submitModeInput]);

  // ── Auto-mic: activate speech recognition when open discussion mode opens ──
  // When the facilitator transitions to open discussion, the floor is open for
  // everyone to speak simultaneously. We auto-start the browser speech recognition
  // so participants don't need to manually click the mic button — mirroring the
  // experience of a real meeting where the mic is live when the floor is open.
  const prevModeKeyRef = React.useRef<string | null>(null);
  // pendingAutoMicRef: set to true when we enter open_discussion while AI is
  // still speaking. Effect 2 fires the mic once AI stops.
  const pendingAutoMicRef = React.useRef(false);
  // Effect 1: detect the mode transition INTO open_discussion
  React.useEffect(() => {
    const prevMode = prevModeKeyRef.current;
    prevModeKeyRef.current = effectiveModeKey;
    if (!isOpenDiscussionMode) { pendingAutoMicRef.current = false; return; }
    if (prevMode === 'open_discussion') return; // already in this mode, no transition
    if (!speechStackEnabled) return;
    if (isRecording) return;
    if (aiIsSpeaking) {
      // Defer: AI is still speaking, fire mic once it stops
      pendingAutoMicRef.current = true;
      return;
    }
    pendingAutoMicRef.current = false;
    const timer = window.setTimeout(() => setIsRecording(true), 800);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveModeKey, isOpenDiscussionMode, speechStackEnabled]);
  // Effect 2: fire deferred auto-mic once AI finishes speaking
  React.useEffect(() => {
    if (!pendingAutoMicRef.current) return;
    if (aiIsSpeaking) return;
    if (!isOpenDiscussionMode || !speechStackEnabled || isRecording) {
      pendingAutoMicRef.current = false;
      return;
    }
    pendingAutoMicRef.current = false;
    const timer = window.setTimeout(() => setIsRecording(true), 800);
    return () => window.clearTimeout(timer);
  }, [aiIsSpeaking, isOpenDiscussionMode, speechStackEnabled, isRecording, setIsRecording]);

  // ── Open discussion conversation history ─────────────────────────────────
  // Show the last few messages from the open discussion in the main view so
  // participants can see what has been said (their own messages + others).
  const openDiscussionRecentMessages = React.useMemo(() => {
    if (!isOpenDiscussionMode) return [];
    return [...messages]
      .filter((m) => !m.isPrivateToHost)
      .slice(-8);
  }, [isOpenDiscussionMode, messages]);

  const renderPeoplePanel = (panelVariant: 'desktop' | 'mobile') => {
    const isMobilePanel = panelVariant === 'mobile';

    return (
      <div
        className={isMobilePanel ? 'flex max-h-[32dvh] min-h-[150px] flex-col overflow-hidden p-2' : 'flex min-h-0 flex-1 flex-col p-3'}
        data-camera-toggle={`participant-${panelVariant}-preview`}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* AI in room: Facilitator tile is shown with everyone else in the participant room-gallery. */}
          <SessionVideoGrid
            participants={participantVideoTiles}
            variant="participant-sidebar"
            emptyLabel="Video tiles will appear as participants join the session."
          />
        </div>
      </div>
    );
  };

  const renderChatPanel = (panelVariant: 'desktop' | 'mobile') => {
    const isMobilePanel = panelVariant === 'mobile';

    return (
      <div className={isMobilePanel ? 'max-h-[32dvh] overflow-y-auto p-2' : 'min-h-0 flex-1 overflow-y-auto p-3'}>
        {latestParticipantMessages.length > 0 ? (
          <div className="space-y-3">
            {latestParticipantMessages.map((message) => (
              <div key={message.id} className="session-soft-panel rounded-2xl p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-semibold text-indigo-600">{message.sender === 'admin' ? 'Host' : resolveParticipantDisplayName(message.participant, (message as Message & { displayName?: string }).displayName || message.name)}</span>
                  <span className="font-mono text-[10px] text-slate-500">{getMessageTime(message)}</span>
                </div>
                <p className="line-clamp-4 text-xs leading-relaxed text-slate-700">{message.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-[140px] items-center justify-center rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Participant messages will appear here during the session.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="session-redesign-shell flex h-full flex-col overflow-hidden text-slate-900">
      {/* Audio unlock banner — shown until the participant clicks to enable audio */}
      {!audioUnlocked && viewMode === 'participant' && ttsAvatarEnabled && (
        <div
          role="banner"
          className="shrink-0 flex cursor-pointer items-center justify-between gap-3 bg-indigo-600 px-4 py-2.5 text-white transition-opacity hover:bg-indigo-700"
          onClick={handleUnlockAudio}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-lg">🔊</span>
            <span>Tap here to hear the AI facilitator’s voice</span>
          </div>
          <button
            type="button"
            className="rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            onClick={handleUnlockAudio}
          >
            Enable Audio
          </button>
        </div>
      )}
      <div className="session-glass-panel shrink-0 rounded-b-[1.5rem] border-b border-slate-200 px-3 py-2 md:rounded-b-[1.75rem] md:px-4 md:py-3">
        <div className="flex items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50 text-indigo-600 sm:flex">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold tracking-tight text-slate-950 md:text-base">{sessionTitle}</p>
            <p className="truncate text-[11px] text-slate-500 md:text-xs">Facilitated by {facilitatorName}</p>
          </div>
          <div className="session-chip hidden border-emerald-200 bg-emerald-50 text-emerald-700 sm:flex" title={roomConnectionLabel} aria-label={roomConnectionLabel}>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]" />
            {roomConnectionLabel}
          </div>
          <div className="session-chip border-slate-200 bg-white text-slate-600">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            {currentParticipantCount}/{maxParticipants}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleLocalMicrophoneClick}
              className={`session-control-button flex h-11 w-11 items-center justify-center rounded-xl border transition md:h-8 md:w-8 ${microphoneEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              aria-label={microphoneEnabled ? 'Turn microphone off' : 'Turn microphone on'}
              title={microphoneEnabled ? 'Microphone on' : 'Microphone off'}
            >
              {microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              <span className="sr-only">{microphoneEnabled ? 'Mic on' : 'Muted'}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleLocalCameraClick}
              disabled={cameraStatus === 'starting'}
              className={`session-control-button flex h-11 w-11 items-center justify-center rounded-xl border transition disabled:cursor-wait disabled:opacity-70 md:h-8 md:w-8 ${cameraIsOn ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              aria-label={cameraIsOn ? 'Turn camera off' : 'Turn camera on'}
              title={cameraStatusLabel}
              data-camera-toggle="participant-local-preview"
            >
              {cameraIsOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="session-control-button hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:flex"
              aria-label="Captions status"
            >
              <Captions className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-2 p-2 md:gap-3 md:p-3">
        <main className="session-glass-panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] md:rounded-[2rem]">
          <section className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4">
            <div className="session-soft-panel rounded-2xl p-3 md:p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">Current question</span>
                <span className="session-chip border-indigo-200 bg-indigo-50 text-indigo-700">
                  {isWaitingForResponses || isWaitingForResponse ? 'Collecting responses' : effectiveModeLabel}
                </span>
              </div>
              <p className="line-clamp-5 text-sm font-medium leading-relaxed text-slate-700 md:line-clamp-none md:text-base">
                {latestAssistantMessage?.content || activeMode?.prompt || 'The AI facilitator is preparing the next question for the room.'}
              </p>
              {(activeMode || techniqueModeContext) && (
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {effectiveModeInstruction}
                </p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <div className="session-progress-track h-1.5 flex-1 overflow-hidden rounded-full">
                  <div className="session-progress-fill h-full rounded-full transition-all duration-700" style={{ width: `${responseProgress}%` }} />
                </div>
                <span className="shrink-0 font-mono text-xs text-slate-500">{effectiveResponseCount}/{responseTotal} responded</span>
              </div>
            </div>

            {!isOpenDiscussionMode && hasRegisteredResponse && (
              <div className="session-soft-panel mt-3 rounded-2xl border-emerald-200 bg-emerald-50 p-3 md:p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Your response is registered
                </div>
                {(isOpenDiscussionMode ? latestOwnParticipantMessage?.content : modeResponsePreview) ? (
                  <blockquote className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
                    {isOpenDiscussionMode ? latestOwnParticipantMessage?.content : modeResponsePreview}
                  </blockquote>
                ) : (
                  <p className="text-sm leading-relaxed text-emerald-700">
                    Your answer has been submitted. Waiting for the rest of the room before the facilitator continues.
                  </p>
                )}
              </div>
            )}

            {/* Open discussion: live conversation history in the main view */}
            {isOpenDiscussionMode && openDiscussionRecentMessages.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400">Live discussion</p>
                {openDiscussionRecentMessages.map((msg) => {
                  const isOwn = msg.sender === 'user' && (effectiveParticipantId === 0 || String(msg.participant) === String(effectiveParticipantId));
                  const isAI = msg.sender === 'assistant';
                  const displayName = isAI
                    ? (facilitatorName || 'AI Facilitator')
                    : isOwn
                    ? 'You'
                    : resolveParticipantDisplayName(msg.participant, (msg as Message & { displayName?: string }).displayName || msg.name);
                  return (
                    <div
                      key={msg.id}
                      className={`rounded-2xl px-3 py-2.5 text-sm leading-relaxed ${
                        isAI
                          ? 'session-soft-panel border-indigo-100 bg-indigo-50/60 text-slate-800'
                          : isOwn
                          ? 'ml-4 border border-emerald-200 bg-emerald-50 text-emerald-900'
                          : 'border border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <span className={`mr-2 text-[11px] font-bold ${
                        isAI ? 'text-indigo-600' : isOwn ? 'text-emerald-700' : 'text-slate-500'
                      }`}>{displayName}</span>
                      {msg.content}
                    </div>
                  );
                })}
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
            <div className="shrink-0 border-t border-slate-200 bg-white/90 md:block">
              <InputFooter
                participantCount={maxParticipants}
                currentParticipant={effectiveParticipantId}
                participantNames={participantNames}
                participants={participantPeers}
                inputMessage={inputMessage}
                setInputMessage={setInputMessage}
                onSendMessage={() => { void handleModeAwareTextSubmit(); }}
                isRecording={isRecording}
                setIsRecording={setIsRecording}
                currentUserParticipantId={effectiveParticipantId}
                isAnonymous={isAnonymous}
                toggleAnonymous={toggleAnonymous}
                hasAnswered={hasAnswered || (!isOpenDiscussionMode && (hasRegisteredResponse || hasSubmittedModeChoice))}
                totalResponses={totalResponses}
                viewMode={viewMode}
                messages={messages}
                showResponseStats={showResponseStats}
                conversationId={conversationId}
                speechEnabled={speechStackEnabled && !aiIsSpeaking}
                speechLanguage={phase3Settings?.speech_default_language || conversationData?.language || 'en-US'}
                onSpeechInterim={handleSpeechInterim}
                onSpeechFinal={handleSpeechFinal}
                placeholder={effectiveModePlaceholder}
                disabledPlaceholder={!isOpenDiscussionMode && (hasRegisteredResponse || hasSubmittedModeChoice) ? `${effectiveModeLabel} response registered. Waiting for the facilitator to continue…` : effectiveModePlaceholder}
                disabled={modeComposerDisabled}
                modeContext={activeMode || isOpenDiscussionMode || techniqueModeContext ? {
                  label: effectiveModeLabel,
                  instruction: effectiveModeInstruction,
                  component: techniqueModeContext && !activeMode ? techniqueModeContext.modeKey : modeComposerComponent,
                  modeKey: effectiveModeKey,
                  stateLabel: techniqueModeContext && !activeMode
                    ? 'Selected facilitation technique'
                    : isOpenDiscussionMode
                      ? activeMode
                        ? 'Open floor'
                        : 'Default open floor'
                      : hasRegisteredResponse || hasSubmittedModeChoice
                        ? 'Response registered'
                        : modeCanSubmit
                          ? isRoundRobinMode && !participantModeState?.is_current_speaker
                            ? 'Waiting for your turn'
                            : 'Ready for your input'
                          : 'Not open yet',
                  isComplete: !isOpenDiscussionMode && (hasRegisteredResponse || hasSubmittedModeChoice),
                } : undefined}
                modeOptions={modeChoices}
                selectedModeOptionId={submittedChoiceId}
                submittingModeOptionId={submittingChoiceId}
                modeCanSubmit={modeCanSubmit}
                participantModeState={participantModeState}
                modeInputError={modeInputError}
                onVote={(choice) => void handleSubmitModeChoice(choice, 'vote')}
                onWordPick={(choice) => void handleSubmitModeChoice(choice, 'reflection_word')}
                handRaiseState={
                  participantModeState?.is_current_speaker || participantModeState?.can_speak
                    ? 'floor_granted'
                    : localDebateHandRaised || Boolean((participantModeState?.state as Record<string, unknown> | undefined)?.hand_raised)
                      ? 'raised'
                      : 'idle'
                }
                floorGranted={Boolean(participantModeState?.is_current_speaker || participantModeState?.can_speak)}
                onHandRaiseToggle={async (raised) => {
                  if (!activeMode || !effectiveParticipantId) return;
                  const previousHandRaised = localDebateHandRaised;
                  setLocalDebateHandRaised(raised);
                  try {
                    await updateModeParticipantState({
                      conversationId,
                      activeModeId: activeMode.id,
                      participantId: effectiveParticipantId,
                      state: { ...(participantModeState?.state as Record<string, unknown> | undefined), hand_raised: raised },
                      canSpeak: false,
                      isCurrentSpeaker: false,
                      canSubmit: true,
                      allowedActions: raised ? ['lower_hand'] : ['raise_hand'],
                    });
                  } catch (error) {
                    setLocalDebateHandRaised(previousHandRaised);
                    console.warn('Unable to update Debate hand-raise state:', error);
                  }
                }}
                onReaction={(reaction) => {
                  if (isOpenDiscussionMode && submitModeInput) {
                    void submitModeInput({
                      participantId: effectiveParticipantId,
                      inputType: 'reaction',
                      content: {
                        reaction,
                        modeKey: effectiveModeKey,
                        source: 'participant_quick_reaction',
                      },
                      visibility: 'public',
                    }).catch((error) => {
                      console.warn('Unable to submit Open Discussion quick reaction:', error);
                    });
                  } else {
                    console.info('Participant quick reaction', { reaction, modeKey: effectiveModeKey });
                  }
                }}
              />
            </div>
          )}
        </main>

        <aside className="session-glass-panel hidden w-[292px] shrink-0 flex-col overflow-hidden rounded-[2rem] md:flex">
          <div className="flex border-b border-slate-200 p-2">
            <button
              type="button"
              onClick={() => setSidebarTab('people')}
              className={`session-control-button flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${sidebarTab === 'people' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <Users className="h-4 w-4" />
              People
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('chat')}
              className={`session-control-button flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${sidebarTab === 'chat' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </button>
          </div>

          {sidebarTab === 'people' ? renderPeoplePanel('desktop') : renderChatPanel('desktop')}
        </aside>
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/95 px-2 py-2 md:hidden">
        <div className="session-glass-panel overflow-hidden rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/40">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{sidebarTab === 'people' ? 'People' : 'Chat'}</span>
            <span className="text-xs font-medium text-slate-500">{sidebarTab === 'people' ? `${currentParticipantCount}/${maxParticipants} present` : `${latestParticipantMessages.length} recent`}</span>
          </div>
          {sidebarTab === 'people' ? renderPeoplePanel('mobile') : renderChatPanel('mobile')}
        </div>
      </div>

      <div className="relative z-20 grid shrink-0 grid-cols-2 border-t border-slate-200 bg-white/95 p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden">
        <button
          type="button"
          onClick={() => setSidebarTab('people')}
          className={`session-control-button flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${sidebarTab === 'people' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          aria-pressed={sidebarTab === 'people'}
        >
          <Users className="h-4 w-4" /> People
        </button>
        <button
          type="button"
          onClick={() => setSidebarTab('chat')}
          className={`session-control-button flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${sidebarTab === 'chat' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
          aria-pressed={sidebarTab === 'chat'}
        >
          <MessageSquare className="h-4 w-4" /> Chat
        </button>
      </div>
    </div>
  );
};

export default ParticipantMessagingView;
