/**
 * Host Session Content
 *
 * Signal & Clarity host command-center integration slice. This keeps the
 * existing host messaging/control implementation intact, but places it inside
 * the UX handoff's light, resizable multi-panel shell with a participant
 * intelligence rail and a live session pulse panel.
 */

import React from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Check, Clock3, Copy, LayoutGrid, MonitorUp, Play, QrCode, Users, Video, VideoOff, Wifi } from "lucide-react";
import SimplifiedHostMessagingView from "@/components/session/messaging/SimplifiedHostMessagingView";
import HostParticipantList from "@/components/session/HostParticipantList";
import ParticipantAvatar from "@/components/chat/avatars/ParticipantAvatar";
import { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession } from "@/types/database";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";
import { SessionVideoGrid, SessionVideoTile, type SessionVideoParticipant } from "@/components/session/video/SessionVideoGrid";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/components/ui/use-toast";
import { useWebRTCSession, type WebRTCPeerStatus } from "@/hooks/useWebRTCSession";
import { inferFacilitatorVoiceGender } from "@/utils/facilitatorVoiceGender";

interface HostSessionContentProps {
  sessionMessages: Message[];
  participantColors: { [key: string]: string };
  conversationData: ConversationWithSession | null;
  participants: ParticipantInfo[];
  isLoadingParticipants: boolean;
  currentConversationId: number | null;
  onSendMessage?: (message: string, isPinned: boolean, recipientId?: string) => void;
  
  // Response collection props
  isWaitingForResponses?: boolean;
  responseCount?: number;
  totalParticipants?: number;
  onTriggerFacilitatorResponse?: (hostInstruction?: string) => void;
  enabledTools?: FacilitatorToolAssignment[];
  isLoadingToolbox?: boolean;
  toolboxError?: string | null;
  enabledModes?: FacilitatorModeAssignment[];
  activeMode?: SessionActiveMode | null;
  recentModeEvents?: SessionModeEvent[];
  isLoadingModes?: boolean;
  modeError?: string | null;
  onStartMode?: (mode: FacilitatorModeAssignment, prompt?: string) => Promise<void>;
  onApproveMode?: (reason?: string) => Promise<void>;
  onEndMode?: (reason?: string) => Promise<void>;
  onRejectMode?: (reason?: string) => Promise<void>;
  
  // Session start props
  isSessionStarted?: boolean;
  onSessionStarted?: () => void;
  
  // Auto-start props
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;

  // Session state
  isSessionEnded?: boolean;
  isSessionPaused?: boolean;
}

const formatEventLabel = (eventType: string): string => eventType.replace(/^mode\./, '').replace(/_/g, ' ');

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

const formatParticipantInitials = (participant: ParticipantInfo): string => {
  const source = participant.name?.trim() || `P${participant.id}`;
  return source
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const HostSessionContent: React.FC<HostSessionContentProps> = ({
  sessionMessages,
  participantColors,
  conversationData,
  participants,
  isLoadingParticipants,
  currentConversationId,
  onSendMessage,
  isWaitingForResponses = false,
  responseCount = 0,
  totalParticipants = 1,
  onTriggerFacilitatorResponse,
  activeMode = null,
  isSessionStarted = false,
  onSessionStarted,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
}) => {
  const [videoLayout, setVideoLayout] = React.useState<'spotlight' | 'gallery'>('spotlight');
  const [hasCopiedInviteLink, setHasCopiedInviteLink] = React.useState(false);
  const { toast } = useToast();
  const [pinnedTileId, setPinnedTileId] = React.useState<string | null>(null);
  const [hostCameraStream, setHostCameraStream] = React.useState<MediaStream | null>(null);
  const [hostCameraStatus, setHostCameraStatus] = React.useState<'off' | 'starting' | 'on' | 'blocked' | 'unsupported'>('off');
  const [hostCameraError, setHostCameraError] = React.useState<string | null>(null);
  const hostCameraStreamRef = React.useRef<MediaStream | null>(null);
  const hostCameraStartPromiseRef = React.useRef<Promise<MediaStream | null> | null>(null);
  const hostCameraRequestIdRef = React.useRef(0);
  const actualParticipantCount = participants.length;
  const responseTotal = Math.max(totalParticipants, actualParticipantCount, 1);
  const responseProgress = Math.min(100, Math.round((responseCount / responseTotal) * 100));
  const assistantMessageCount = sessionMessages.filter((message) => message.sender === "assistant").length;
  const participantMessageCount = sessionMessages.filter((message) => message.sender !== "assistant").length;
  const activeModeKey = activeMode?.facilitation_mode?.mode_key;
  const modeName = activeMode?.facilitation_mode?.display_name
    || enabledModes.find((mode) => mode.mode_key === activeModeKey)?.display_name
    || "Open Discussion";
  const latestEvents = recentModeEvents.slice(0, 4);
  const stopHostCamera = React.useCallback(() => {
    hostCameraRequestIdRef.current += 1;
    hostCameraStartPromiseRef.current = null;
    if (hostCameraStreamRef.current) {
      hostCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      hostCameraStreamRef.current = null;
    }
    setHostCameraStream(null);
    setHostCameraStatus('off');
  }, []);

  const startHostCamera = React.useCallback(async () => {
    if (hostCameraStreamRef.current) {
      setHostCameraStatus('on');
      return hostCameraStreamRef.current;
    }
    if (hostCameraStartPromiseRef.current) return hostCameraStartPromiseRef.current;
    if (!navigator.mediaDevices?.getUserMedia) {
      setHostCameraStatus('unsupported');
      setHostCameraError('Camera is not supported in this browser.');
      return null;
    }

    const requestId = hostCameraRequestIdRef.current + 1;
    hostCameraRequestIdRef.current = requestId;
    setHostCameraStatus('starting');
    setHostCameraError(null);

    const startPromise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 540 } },
      audio: false,
    }).then((stream) => {
      if (hostCameraRequestIdRef.current !== requestId) {
        stream.getTracks().forEach((track) => track.stop());
        return null;
      }
      if (hostCameraStreamRef.current && hostCameraStreamRef.current !== stream) {
        hostCameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      hostCameraStreamRef.current = stream;
      setHostCameraStream(stream);
      setHostCameraStatus('on');
      return stream;
    }).catch((error) => {
      if (hostCameraRequestIdRef.current !== requestId) return null;
      console.error('Error accessing host camera:', error);
      hostCameraStreamRef.current = null;
      setHostCameraStream(null);
      setHostCameraStatus('blocked');
      setHostCameraError('Camera access was blocked. Allow camera permission in your browser to appear on video.');
      return null;
    }).finally(() => {
      if (hostCameraStartPromiseRef.current === startPromise) {
        hostCameraStartPromiseRef.current = null;
      }
    });

    hostCameraStartPromiseRef.current = startPromise;
    return startPromise;
  }, []);

  const toggleHostCamera = React.useCallback(() => {
    if (hostCameraStreamRef.current) {
      stopHostCamera();
      return;
    }
    if (hostCameraStartPromiseRef.current) return;
    void startHostCamera();
  }, [startHostCamera, stopHostCamera]);

  React.useEffect(() => {
    return () => {
      hostCameraRequestIdRef.current += 1;
      hostCameraStartPromiseRef.current = null;
      if (hostCameraStreamRef.current) {
        hostCameraStreamRef.current.getTracks().forEach((track) => track.stop());
        hostCameraStreamRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (isSessionEnded) stopHostCamera();
  }, [isSessionEnded, stopHostCamera]);

  const shouldEnableHostVideoRoom = Boolean(currentConversationId) && !isSessionEnded;
  const { remoteStreams, peerStatuses } = useWebRTCSession({
    conversationId: currentConversationId,
    role: 'host',
    participants,
    localStream: hostCameraStream,
    enabled: shouldEnableHostVideoRoom,
  });
  const facilitatorDetails = conversationData?.sessions?.facilitator_details as { id?: number; title?: string | null; profile_picture?: string | null; details?: string | null; description?: string | null } | undefined;
  const facilitatorVoiceGender = React.useMemo(() => inferFacilitatorVoiceGender({
    title: facilitatorDetails?.title,
    details: facilitatorDetails?.details,
    description: facilitatorDetails?.description,
    profilePicture: facilitatorDetails?.profile_picture,
  }), [facilitatorDetails?.description, facilitatorDetails?.details, facilitatorDetails?.profile_picture, facilitatorDetails?.title]);
  const facilitatorVoiceGenderLabel = facilitatorVoiceGender === 'female' ? 'Female voice' : facilitatorVoiceGender === 'male' ? 'Male voice' : 'Default voice';
  const latestSessionMessage = sessionMessages[sessionMessages.length - 1];
  const respondedParticipantIds = new Set(
    sessionMessages
      .filter((message) => message.sender === "user" && message.participant)
      .map((message) => String(message.participant))
  );
  const hostVideoParticipants: SessionVideoParticipant[] = [
    {
      id: 'ai-facilitator',
      name: facilitatorDetails?.title || 'AI Facilitator',
      initials: 'AI',
      avatarUrl: facilitatorDetails?.profile_picture,
      isAI: true,
      isMuted: false,
      isSpeaking: latestSessionMessage?.sender === 'assistant',
      accentColor: 'rgb(217 119 6)',
    },
    {
      id: 'host-self',
      name: 'Host (You)',
      initials: 'H',
      mediaStream: hostCameraStream,
      isYou: true,
      isMuted: true,
      isSpeaking: hostCameraStatus === 'on',
      connectionStatus: hostCameraStatus === 'blocked' ? 'failed' : hostCameraStatus === 'unsupported' ? 'unsupported' : hostCameraStatus === 'starting' ? 'connecting' : hostCameraStatus === 'off' ? 'idle' : undefined,
      connectionStatusLabel: hostCameraStatus === 'blocked' ? 'Camera blocked' : hostCameraStatus === 'unsupported' ? 'Camera unsupported' : hostCameraStatus === 'starting' ? 'Starting camera…' : hostCameraStatus === 'off' ? 'Camera off' : undefined,
      accentColor: 'rgb(79 70 229)',
    },
    ...participants.map((participant) => {
      const remoteStream = remoteStreams[String(participant.id)] ?? null;
      const peerStatus = peerStatuses[`participant-${participant.id}`];
      const tileConnectionStatus = getPeerTileConnectionStatus(peerStatus, Boolean(remoteStream));

      return {
        id: String(participant.id),
        name: participant.name || `Participant ${participant.id}`,
        initials: formatParticipantInitials(participant),
        avatarUrl: participant.avatar,
        accentColor: participantColors[String(participant.id)] || undefined,
        mediaStream: remoteStream,
        isMuted: true,
        hasResponded: respondedParticipantIds.has(String(participant.id)),
        connectionStatus: tileConnectionStatus,
        connectionStatusLabel: formatPeerTileStatusLabel(tileConnectionStatus),
      };
    }),
  ];
  const featuredVideoParticipant = hostVideoParticipants.find((participant) => participant.id === pinnedTileId)
    || hostVideoParticipants[0];
  const videoStripParticipants = hostVideoParticipants.filter((participant) => participant.id !== featuredVideoParticipant.id);
  const sessionTitle = conversationData?.sessions?.title || "Untitled session";
  const facilitatorName = facilitatorDetails?.title || "AI Facilitator";
  const maxParticipants = conversationData?.participants || Math.max(actualParticipantCount, 1);
  const joinedParticipantCount = actualParticipantCount;
  const joinToken = (conversationData as any)?.join_token;
  const sessionInviteLink = React.useMemo(() => {
    if (!currentConversationId || typeof window === 'undefined') return '';
    const baseUrl = `${window.location.origin}/join-session?id=${currentConversationId}`;
    return joinToken ? `${baseUrl}&token=${encodeURIComponent(String(joinToken))}` : baseUrl;
  }, [currentConversationId, joinToken]);
  const truncatedInviteLink = sessionInviteLink.length > 54 ? `${sessionInviteLink.slice(0, 51)}…` : sessionInviteLink;
  const waitingParticipants = participants.filter((participant) => !participant.isHost && !participant.isAdmin);
  const participantRowsToShow = Math.max(1, Math.min(waitingParticipants.length || maxParticipants, 6));
  const participantListViewportHeight = waitingParticipants.length > 0
    ? Math.min(420, Math.max(84, participantRowsToShow * 72))
    : 156;

  const handleCopyInviteLink = React.useCallback(async () => {
    if (!sessionInviteLink) return;
    try {
      await navigator.clipboard.writeText(sessionInviteLink);
      setHasCopiedInviteLink(true);
      window.setTimeout(() => setHasCopiedInviteLink(false), 1800);
      toast({ title: "Invite link copied", description: "Participants can use this link to join the session." });
    } catch (error) {
      console.error('Failed to copy invite link:', error);
      toast({ title: "Copy failed", description: "Could not copy the invite link to the clipboard.", variant: "destructive" });
    }
  }, [sessionInviteLink, toast]);

  if (!isSessionStarted && !isSessionEnded) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-slate-50 text-slate-950">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
          <section className="mx-auto mb-7 flex w-full max-w-3xl flex-col items-center text-center" style={{ textAlign: 'center' }}>
            <div className="mb-4 inline-flex items-center justify-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Waiting Room
            </div>
            <h1 className="mx-auto w-full text-center font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{sessionTitle}</h1>
            <p className="mx-auto mt-2 w-full text-center text-base text-slate-500">
              Facilitated by <span className="font-semibold text-amber-700">{facilitatorName}</span>
            </p>
          </section>

          <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleCopyInviteLink}
                disabled={!sessionInviteLink}
                className="group flex h-32 w-full shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 text-indigo-600 transition hover:border-indigo-200 hover:bg-indigo-50 sm:w-32"
                aria-label="Copy participant invite link"
              >
                {sessionInviteLink ? <QRCodeSVG value={sessionInviteLink} size={72} bgColor="transparent" fgColor="currentColor" /> : <QrCode className="h-16 w-16" />}
              </button>

              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Invite participants</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">Scan the QR code or share the link below</p>
                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  disabled={!sessionInviteLink}
                  className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1 truncate font-mono text-sm text-slate-700">{truncatedInviteLink || 'Preparing secure invite link…'}</span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
                    {hasCopiedInviteLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {hasCopiedInviteLink ? 'Copied' : 'Copy'}
                  </span>
                </button>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-7 flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-950">Participants</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5"><Wifi className="h-4 w-4 text-emerald-600" />{joinedParticipantCount} joined</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-indigo-600" />{Math.max(0, maxParticipants - joinedParticipantCount)} seats open</span>
              </div>
            </header>

            <div className="overflow-y-auto transition-[height] duration-300" style={{ height: participantListViewportHeight }}>
              {isLoadingParticipants ? (
                <div className="space-y-3 p-5">
                  {Array.from({ length: Math.min(Math.max(maxParticipants, 1), 4) }).map((_, index) => (
                    <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-3">
                      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : waitingParticipants.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {waitingParticipants.map((participant) => {
                    const participantId = String(participant.id);
                    const participantName = participant.name || `Participant ${participant.id}`;
                    const initials = formatParticipantInitials(participant);
                    const accentColor = participantColors[participantId] || 'rgb(79 70 229)';
                    return (
                      <div key={participantId} className="flex items-center justify-between gap-4 px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full shadow-sm ring-2 ring-white" style={{ backgroundColor: accentColor }}>
                            <ParticipantAvatar
                              avatarUrl={participant.avatar?.startsWith('/api/avatar') ? null : participant.avatar}
                              avatarSeed={participant.avatarSeed || participantName}
                              name={participantName}
                              size="lg"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">{participantName}</p>
                            <p className="text-xs text-slate-500">{participant.isAnonymous ? 'Anonymous participant' : 'Participant'}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 text-sm">
                          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700"><Wifi className="h-4 w-4" />Joined</span>
                          <span className="inline-flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-full border border-slate-300" />Waiting</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full min-h-[156px] flex-col items-center justify-center px-6 py-8 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Users className="h-7 w-7" />
                  </div>
                  <p className="text-base font-semibold text-slate-950">Waiting for the first participant</p>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">Share the QR code or invite link. Joined participants will appear here in real time.</p>
                </div>
              )}
            </div>
          </section>

          <div className="mx-auto mt-7 w-full max-w-3xl">
            <button
              type="button"
              onClick={onSessionStarted}
              disabled={!onSessionStarted || joinedParticipantCount === 0 || isAutoStarting}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-6 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              <Play className="h-5 w-5 fill-current" />
              {isAutoStarting ? `Auto-starting in ${autoStartCountdown}s` : 'Start Session'}
            </button>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-500">
              <span>{joinedParticipantCount} of {maxParticipants} participant{maxParticipants === 1 ? '' : 's'} joined</span>
              {isAutoStarting && onCancelAutoStart && (
                <button type="button" onClick={onCancelAutoStart} className="font-semibold text-indigo-700 underline-offset-4 hover:underline">Cancel auto-start</button>
              )}
              {!isAutoStarting && joinedParticipantCount === 0 && <span>At least one participant is required to begin.</span>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="host-session-cockpit session-redesign-shell flex min-h-0 flex-1 flex-col overflow-hidden p-3 text-slate-100">
      <PanelGroup direction="horizontal" className="min-h-0 flex-1 gap-0 rounded-3xl">
        <Panel defaultSize={24} minSize={18} maxSize={34} className="min-h-0">
          <div className="session-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-l-[2rem]">
            <div className="min-h-0 flex-1 overflow-hidden [&>*]:h-full [&>*]:border-0 [&>*]:bg-transparent">
              <HostParticipantList
                participants={participants || []}
                currentParticipantCount={actualParticipantCount}
                maxParticipants={conversationData?.participants || 10}
                isLoading={isLoadingParticipants}
                conversationData={conversationData}
                messages={sessionMessages}
                onSendMessage={onSendMessage}
              />
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex w-3 items-center justify-center">
          <span className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-indigo-300" />
        </PanelResizeHandle>

        <Panel defaultSize={56} minSize={42} className="min-h-0">
          <div className="session-glass-panel flex h-full min-h-0 flex-col overflow-hidden border-y border-slate-200">
            {isSessionStarted && (
            <section className="session-avatar-stage shrink-0 border-b border-slate-200 p-3" aria-label="Host multi-video gallery">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Video room</p>
                  <p className="text-xs text-slate-500">Spotlight the facilitator or switch to the room gallery.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={toggleHostCamera}
                    disabled={hostCameraStatus === 'starting'}
                    className={`session-control-button inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${hostCameraStream ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'} disabled:cursor-wait disabled:opacity-70`}
                  >
                    {hostCameraStream ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
                    {hostCameraStatus === 'starting' ? 'Starting…' : hostCameraStream ? 'Camera on' : 'Camera off'}
                  </button>
                  <div className="flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
                  <button
                    type="button"
                    onClick={() => setVideoLayout('spotlight')}
                    className={`session-control-button inline-flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${videoLayout === 'spotlight' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <MonitorUp className="h-3.5 w-3.5" />
                    Spotlight
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoLayout('gallery')}
                    className={`session-control-button inline-flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${videoLayout === 'gallery' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-100' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Gallery
                  </button>
                  </div>
                </div>
              </div>

              {hostCameraError && (
                <p className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">{hostCameraError}</p>
              )}

              {videoLayout === 'gallery' ? (
                <div>
                  <SessionVideoGrid
                    participants={hostVideoParticipants}
                    variant="host-gallery"
                    showResponseStatus
                    onPin={setPinnedTileId}
                    className="max-h-[360px] overflow-y-auto pr-1"
                  />
                </div>
              ) : (
                <div>
                  <SessionVideoTile
                    participant={featuredVideoParticipant}
                    variant="spotlight"
                    showResponseStatus
                    className="max-h-[300px]"
                  />
                  <SessionVideoGrid
                    participants={videoStripParticipants}
                    variant="host-strip"
                    showResponseStatus
                    onPin={setPinnedTileId}
                    emptyLabel="Participant thumbnails will appear here as people join."
                    className="mt-3"
                  />
                </div>
              )}
            </section>
            )}

          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex w-3 items-center justify-center">
          <span className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-indigo-300" />
        </PanelResizeHandle>

        <Panel defaultSize={20} minSize={18} maxSize={30} className="min-h-0">
          <aside className="session-glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-r-[2rem]">
            <SimplifiedHostMessagingView
              messages={sessionMessages || []}
              participantColors={participantColors}
              currentParticipantCount={actualParticipantCount}
              conversationData={conversationData}
              isWaitingForResponses={isWaitingForResponses}
              responseCount={responseCount}
              totalParticipants={totalParticipants}
              onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
              activeMode={activeMode}
              isSessionStarted={isSessionStarted}
              onSessionStarted={onSessionStarted}
              participants={participants}
              conversationId={currentConversationId}
              isAutoStarting={isAutoStarting}
              autoStartCountdown={autoStartCountdown}
              onCancelAutoStart={onCancelAutoStart}
              isSessionEnded={isSessionEnded}
              isSessionPaused={isSessionPaused}
            />
          </aside>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default HostSessionContent;
