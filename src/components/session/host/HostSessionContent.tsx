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
import { Activity, Brain, Clock3, LayoutGrid, MessageSquare, MonitorUp, Sparkles, Users } from "lucide-react";
import SimplifiedHostMessagingView from "@/components/session/messaging/SimplifiedHostMessagingView";
import HostParticipantList from "@/components/session/HostParticipantList";
import { Message, ParticipantInfo } from "@/types/chat";
import type { ConversationWithSession } from "@/types/database";
import type { FacilitatorToolAssignment } from "@/types/facilitator";
import type { FacilitatorModeAssignment, SessionActiveMode, SessionModeEvent } from "@/services/modeOrchestratorService";
import { SessionVideoGrid, SessionVideoTile, type SessionVideoParticipant } from "@/components/session/video/SessionVideoGrid";
import { useWebRTCSession, type WebRTCPeerStatus, type WebRTCConnectionStatus } from "@/hooks/useWebRTCSession";

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

const formatRoomConnectionLabel = (status: WebRTCConnectionStatus): string => {
  if (status === 'connected') return 'video room connected';
  if (status === 'failed') return 'video reconnect needed';
  if (status === 'disconnected') return 'video reconnecting';
  if (status === 'unsupported') return 'video unsupported';
  if (status === 'idle') return 'video room idle';
  return 'connecting video room';
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
  enabledTools = [],
  isLoadingToolbox = false,
  toolboxError = null,
  enabledModes = [],
  activeMode = null,
  recentModeEvents = [],
  isLoadingModes = false,
  modeError = null,
  onStartMode,
  onApproveMode,
  onEndMode,
  onRejectMode,
  isSessionStarted = false,
  onSessionStarted,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart,
  isSessionEnded = false,
  isSessionPaused = false,
}) => {
  const [videoLayout, setVideoLayout] = React.useState<'spotlight' | 'gallery'>('spotlight');
  const [pinnedTileId, setPinnedTileId] = React.useState<string | null>(null);
  const actualParticipantCount = participants.length;
  const responseTotal = Math.max(totalParticipants, actualParticipantCount, 1);
  const responseProgress = Math.min(100, Math.round((responseCount / responseTotal) * 100));
  const assistantMessageCount = sessionMessages.filter((message) => message.sender === "assistant").length;
  const participantMessageCount = sessionMessages.filter((message) => message.sender !== "assistant").length;
  const modeName = activeMode?.name || enabledModes.find((mode) => mode.mode_slug === activeMode?.mode_slug)?.name || "Open Discussion";
  const latestEvents = recentModeEvents.slice(0, 4);
  const { remoteStreams, connectionStatus, peerStatuses, activePeerCount } = useWebRTCSession({
    conversationId: currentConversationId,
    role: 'host',
    participants,
    localStream: null,
    enabled: !isSessionEnded,
  });
  const facilitatorDetails = conversationData?.sessions?.facilitator_details as { title?: string; profile_picture?: string | null } | undefined;
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
  const liveCameraCount = hostVideoParticipants.filter((participant) => participant.mediaStream).length;
  const videoRoomStatusLabel = `${formatRoomConnectionLabel(connectionStatus)} · ${liveCameraCount} live camera${liveCameraCount === 1 ? '' : 's'} · ${activePeerCount} peer${activePeerCount === 1 ? '' : 's'}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50 p-3 text-slate-950">
      <div className="mb-3 flex shrink-0 flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 shadow-2xl shadow-slate-200/80">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-300/25 bg-indigo-500/15 text-indigo-700">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-base font-bold tracking-tight text-slate-950">Host command center</p>
          <p className="truncate text-xs text-slate-500">{conversationData?.sessions?.title || "Live session"} · {modeName}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          {isSessionStarted && !isSessionEnded ? "Live" : isSessionEnded ? "Ended" : "Standby"}
        </div>
        {isSessionPaused && (
          <div className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-700">
            Paused
          </div>
        )}
      </div>

      <PanelGroup direction="horizontal" className="min-h-0 flex-1 gap-0 rounded-3xl">
        <Panel defaultSize={24} minSize={18} maxSize={34} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-l-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Participant intelligence</p>
                  <p className="mt-1 text-sm font-semibold text-slate-950">{actualParticipantCount}/{conversationData?.participants || 10} present</p>
                </div>
                <Users className="h-5 w-5 text-slate-500" />
              </div>
            </div>
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
          <span className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-indigo-400/60" />
        </PanelResizeHandle>

        <Panel defaultSize={52} minSize={38} className="min-h-0">
          <div className="flex h-full min-h-0 flex-col overflow-hidden border-y border-slate-200 bg-white shadow-2xl shadow-slate-200/80 [&_.bg-white]:bg-white [&_.bg-slate-100]:bg-slate-50">
            <section className="shrink-0 border-b border-slate-200 bg-slate-50/80 p-3" aria-label="Host multi-video gallery">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700">Video room</p>
                  <p className="text-xs text-slate-500">Spotlight the facilitator or switch to a multi-participant gallery · {videoRoomStatusLabel}.</p>
                </div>
                <div className="flex rounded-2xl border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
                  <button
                    type="button"
                    onClick={() => setVideoLayout('spotlight')}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${videoLayout === 'spotlight' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}
                  >
                    <MonitorUp className="h-3.5 w-3.5" />
                    Spotlight
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoLayout('gallery')}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 transition ${videoLayout === 'gallery' ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'}`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Gallery
                  </button>
                </div>
              </div>

              {videoLayout === 'gallery' ? (
                <SessionVideoGrid
                  participants={hostVideoParticipants}
                  variant="host-gallery"
                  showResponseStatus
                  onPin={setPinnedTileId}
                  className="max-h-[360px] overflow-y-auto pr-1"
                />
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
            <div className="min-h-0 flex-1 overflow-hidden">
              <SimplifiedHostMessagingView
              messages={sessionMessages || []}
              participantColors={participantColors}
              currentParticipantCount={actualParticipantCount}
              conversationData={conversationData}
              isWaitingForResponses={isWaitingForResponses}
              responseCount={responseCount}
              totalParticipants={totalParticipants}
              onTriggerFacilitatorResponse={onTriggerFacilitatorResponse}
              enabledTools={enabledTools}
              isLoadingToolbox={isLoadingToolbox}
              toolboxError={toolboxError}
              enabledModes={enabledModes}
              activeMode={activeMode}
              recentModeEvents={recentModeEvents}
              isLoadingModes={isLoadingModes}
              modeError={modeError}
              onStartMode={onStartMode}
              onApproveMode={onApproveMode}
              onEndMode={onEndMode}
              onRejectMode={onRejectMode}
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
            </div>
          </div>
        </Panel>

        <PanelResizeHandle className="group relative flex w-3 items-center justify-center">
          <span className="h-16 w-1 rounded-full bg-slate-200 transition group-hover:bg-indigo-400/60" />
        </PanelResizeHandle>

        <Panel defaultSize={24} minSize={20} maxSize={32} className="min-h-0">
          <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-r-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Session pulse</p>
              <p className="mt-1 text-sm text-slate-500">Live orchestration signals</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <div className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-950">Responses</span>
                  <Activity className="h-4 w-4 text-indigo-700" />
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-indigo-400 transition-all duration-700" style={{ width: `${responseProgress}%` }} />
                </div>
                <p className="mt-2 font-mono text-xs text-slate-500">{responseCount}/{responseTotal} collected</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <Sparkles className="mb-2 h-4 w-4 text-amber-700" />
                  <p className="font-display text-xl font-bold text-slate-950">{assistantMessageCount}</p>
                  <p className="text-xs text-slate-500">AI turns</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <MessageSquare className="mb-2 h-4 w-4 text-emerald-700" />
                  <p className="font-display text-xl font-bold text-slate-950">{participantMessageCount}</p>
                  <p className="text-xs text-slate-500">Room inputs</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-semibold text-slate-950">Recent mode events</span>
                </div>
                {latestEvents.length > 0 ? (
                  <div className="space-y-2">
                    {latestEvents.map((event) => (
                      <div key={event.id} className="rounded-xl bg-slate-100 px-3 py-2">
                        <p className="text-xs font-semibold capitalize text-slate-800">{formatEventLabel(event.event_type)}</p>
                        <p className="truncate text-[11px] text-slate-500">{event.mode_name || event.mode_slug}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs leading-relaxed text-slate-500">
                    Mode recommendations, approvals, and endings will appear here as the session evolves.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default HostSessionContent;
