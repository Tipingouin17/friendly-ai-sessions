/**
 * useWebRTCSession
 *
 * Client-side WebRTC room helper for the light session shells. The current
 * backend exposes database-change realtime channels, not native broadcast or
 * presence channels, so signaling is encoded as short-lived `session_events`
 * rows with `event_type = 'webrtc_signal'`.
 *
 * Participants create the offer to the host and publish their local camera
 * stream. The host answers those offers and can publish its local camera stream
 * in the same negotiated peer connection. Viewers keep received MediaStreams in
 * a participant-id keyed map for the video grid. When a local stream changes,
 * the non-offerer signals camera readiness so the designated offerer renegotiates
 * without SDP glare.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { type RealtimePayload } from '@/lib/api';
import { removeChannel } from '@/utils/realtimeHelpers';
import type { ParticipantInfo } from '@/types/chat';

export type WebRTCRole = 'host' | 'participant';
export type WebRTCSignalType = 'offer' | 'answer' | 'ice-candidate' | 'camera-ready' | 'camera-stopped' | 'reconnect-request';
export type WebRTCConnectionStatus = 'idle' | 'unsupported' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface WebRTCPeerStatus {
  peerId: string;
  participantId: number | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  iceGatheringState: RTCIceGatheringState;
  hasRemoteStream: boolean;
  localCandidateTypes: string[];
  remoteCandidateTypes: string[];
  pendingRemoteCandidateCount: number;
  receiverTrackStates: string[];
  lastSignalAt: string | null;
  lastIceCandidateAt: string | null;
  updatedAt: string;
}

export interface WebRTCIceServerDiagnostic {
  urls: string[];
  hasUsername: boolean;
  hasCredential: boolean;
}

export interface WebRTCStreamDiagnostic {
  hasStream: boolean;
  active: boolean;
  videoTracks: number;
  audioTracks: number;
  trackStates: string[];
}

export interface WebRTCDiagnostics {
  localPeerId: string | null;
  remotePeerIds: string[];
  hasRealtimeSupport: boolean;
  isSignalingConnected: boolean;
  localStream: WebRTCStreamDiagnostic;
  remoteStreamCount: number;
  iceServers: WebRTCIceServerDiagnostic[];
}

interface WebRTCSignalPayload {
  kind: 'webrtc_signal';
  version: 1;
  conversationId: number;
  signalType: WebRTCSignalType;
  fromPeerId: string;
  toPeerId: string;
  fromParticipantId: number | null;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  timestamp: string;
}

interface SessionEventRow {
  id?: number;
  conversation_id?: number;
  event_type?: string;
  data?: WebRTCSignalPayload | Record<string, unknown> | null;
  created_at?: string;
}

interface UseWebRTCSessionOptions {
  conversationId: number | null;
  role: WebRTCRole;
  participantId?: number | null;
  participants: ParticipantInfo[];
  localStream?: MediaStream | null;
  enabled?: boolean;
}

interface UseWebRTCSessionResult {
  remoteStreams: Record<string, MediaStream>;
  /** Last explicit availability announced by each remote camera peer. */
  remoteCameraStates: Record<string, 'on' | 'off'>;
  isSignalingConnected: boolean;
  connectionStatus: WebRTCConnectionStatus;
  peerStatuses: Record<string, WebRTCPeerStatus>;
  activePeerCount: number;
  diagnostics: WebRTCDiagnostics;
  /** Close stale peers and initiate one fresh ICE-backed offer/answer exchange. */
  retryConnection: () => void;
}

interface PeerRecord {
  peerId: string;
  participantId: number | null;
  connection: RTCPeerConnection;
  videoTransceiver?: RTCRtpTransceiver;
  audioTransceiver?: RTCRtpTransceiver;
  offerInProgress?: boolean;
  queuedRenegotiation?: PeerNegotiationOptions;
  localCandidateTypes: Set<string>;
  remoteCandidateTypes: Set<string>;
  lastSignalAt: string | null;
  lastIceCandidateAt: string | null;
  remoteStream?: MediaStream;
}

interface PeerNegotiationOptions {
  iceRestart?: boolean;
}

const WEBRTC_EVENT_TYPE = 'webrtc_signal';
export const HOST_VIDEO_STREAM_KEY = 'host';
const HOST_PEER_ID = 'host';
const WEBRTC_SIGNAL_RETENTION_MS = 30 * 60 * 1000;
const WEBRTC_SIGNAL_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const WEBRTC_SIGNAL_CATCHUP_INTERVAL_MS = 3_000;
const WEBRTC_SIGNAL_CATCHUP_LOOKBACK_MS = 15_000;
const WEBRTC_SIGNAL_CATCHUP_LIMIT = 80;
// The participant is the designated initial offerer to the host. One bounded
// retry covers subscription races without creating an endless offer/ICE storm.
const WEBRTC_CAMERA_READY_BURST_COUNT = 2;
const WEBRTC_CAMERA_READY_BURST_INTERVAL_MS = 3_000;
const WEBRTC_ICE_RENEGOTIATION_DELAY_MS = 750;
const WEBRTC_ICE_STALL_TIMEOUT_MS = 12_000;
const WEBRTC_CAMERA_READY_STALE_MS = WEBRTC_ICE_STALL_TIMEOUT_MS;
const WEBRTC_SIGNAL_MAX_CAMERA_AGE_MS = 45_000;
const WEBRTC_SIGNAL_CRITICAL_RETRY_COUNT = 3;
const WEBRTC_SIGNAL_CRITICAL_RETRY_DELAY_MS = 300;
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const participantPeerId = (participantId: number): string => `participant-${participantId}`;
const parseParticipantIdFromPeerId = (peerId: string): number | null => {
  const match = peerId.match(/^participant-(\d+)$/);
  return match ? Number(match[1]) : null;
};

const getRemoteOfferMediaDirection = (connection: RTCPeerConnection, kind: 'audio' | 'video'): RTCRtpTransceiverDirection | null => {
  const remoteDescription = connection.remoteDescription;
  if (remoteDescription?.type !== 'offer' || !remoteDescription.sdp) return null;

  const mediaSections = remoteDescription.sdp.split(/\r?\nm=/);
  const section = mediaSections.find((candidate, index) => {
    const normalizedSection = index === 0 ? candidate : `m=${candidate}`;
    return normalizedSection.startsWith(`m=${kind} `);
  });
  if (!section) return null;

  const direction = section.match(/(?:^|\r?\n)a=(sendrecv|sendonly|recvonly|inactive)(?:\r?\n|$)/)?.[1];
  if (direction === 'sendrecv' || direction === 'sendonly' || direction === 'recvonly' || direction === 'inactive') return direction;
  return 'sendrecv';
};

const resolveTransceiverDirection = (
  connection: RTCPeerConnection,
  kind: 'audio' | 'video',
  hasLocalTrack: boolean,
): RTCRtpTransceiverDirection => {
  const remoteOfferDirection = getRemoteOfferMediaDirection(connection, kind);
  if (!remoteOfferDirection) return hasLocalTrack ? 'sendrecv' : 'recvonly';

  if (remoteOfferDirection === 'sendrecv') return hasLocalTrack ? 'sendrecv' : 'recvonly';
  if (remoteOfferDirection === 'sendonly') return 'recvonly';
  if (remoteOfferDirection === 'recvonly') return hasLocalTrack ? 'sendonly' : 'inactive';
  return 'inactive';
};

const buildIceServers = (): RTCIceServer[] => {
  const turnUrls = (import.meta.env.VITE_WEBRTC_TURN_URLS as string | undefined)?.trim();
  const turnUsername = (import.meta.env.VITE_WEBRTC_TURN_USERNAME as string | undefined)?.trim();
  const turnCredential = (import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL as string | undefined)?.trim();

  if (!turnUrls) return DEFAULT_ICE_SERVERS;

  const configuredServers: RTCIceServer[] = turnUrls
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({
      urls: url,
      ...(turnUsername ? { username: turnUsername } : {}),
      ...(turnCredential ? { credential: turnCredential } : {}),
    }));

  return [...DEFAULT_ICE_SERVERS, ...configuredServers];
};

const ICE_CONFIGURATION: RTCConfiguration = {
  iceServers: buildIceServers(),
};

const describeIceServers = (servers: RTCIceServer[] | undefined): WebRTCIceServerDiagnostic[] => {
  return (servers ?? []).map((server) => ({
    urls: Array.isArray(server.urls) ? server.urls : [server.urls],
    hasUsername: Boolean(server.username),
    hasCredential: Boolean(server.credential),
  }));
};

const summarizeStream = (stream: MediaStream | null): WebRTCStreamDiagnostic => ({
  hasStream: Boolean(stream),
  active: Boolean(stream?.active),
  videoTracks: stream?.getVideoTracks().length ?? 0,
  audioTracks: stream?.getAudioTracks().length ?? 0,
  trackStates: stream?.getTracks().map((track) => `${track.kind}:${track.readyState}${track.enabled ? ':enabled' : ':disabled'}`) ?? [],
});

const extractCandidateType = (candidate: RTCIceCandidateInit | RTCIceCandidate): string | null => {
  const candidateText = typeof candidate.candidate === 'string' ? candidate.candidate : '';
  const typeMatch = candidateText.match(/ typ ([a-z0-9-]+)/i);
  return typeMatch?.[1] ?? null;
};

const getSignalAgeMs = (signal: Pick<WebRTCSignalPayload, 'timestamp'>): number | null => {
  const parsedTimestamp = Date.parse(signal.timestamp);
  if (!Number.isFinite(parsedTimestamp)) return null;
  return Date.now() - parsedTimestamp;
};

const isSignalOlderThan = (signal: Pick<WebRTCSignalPayload, 'timestamp'>, maxAgeMs: number): boolean => {
  const ageMs = getSignalAgeMs(signal);
  return ageMs !== null && ageMs > maxAgeMs;
};

const isIgnorableStaleSignalError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  const message = error.message.toLowerCase();
  return message.includes('unknown ufrag')
    || message.includes('remote description indicates ice restart but offer did not request ice restart');
};

const isIncompatibleSessionDescriptionError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  const message = error.message.toLowerCase();
  return message.includes('answer tried to set recv when offer did not set send')
    || message.includes('answer tried to set send when offer did not set recv')
    || message.includes('failed to set remote answer sdp')
    || message.includes('failed to set local answer sdp');
};

const buildInactiveTransceiverDirection = (
  connection: RTCPeerConnection,
  kind: 'audio' | 'video',
  hasLocalTrack: boolean,
): RTCRtpTransceiverDirection => {
  const remoteOfferDirection = getRemoteOfferMediaDirection(connection, kind);
  if (remoteOfferDirection === 'recvonly') return hasLocalTrack ? 'sendonly' : 'inactive';
  if (remoteOfferDirection === 'sendonly') return 'recvonly';
  if (remoteOfferDirection === 'sendrecv') return hasLocalTrack ? 'sendrecv' : 'recvonly';
  return hasLocalTrack ? 'sendonly' : 'inactive';
};

const isSignalPayload = (value: unknown): value is WebRTCSignalPayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WebRTCSignalPayload>;
  return candidate.kind === 'webrtc_signal'
    && candidate.version === 1
    && typeof candidate.signalType === 'string'
    && typeof candidate.fromPeerId === 'string'
    && typeof candidate.toPeerId === 'string';
};

const summarizeConnectionStatus = (
  enabled: boolean,
  hasRealtimeSupport: boolean,
  isSignalingConnected: boolean,
  peerStatuses: Record<string, WebRTCPeerStatus>,
): WebRTCConnectionStatus => {
  if (!enabled) return 'idle';
  if (!hasRealtimeSupport) return 'unsupported';
  if (!isSignalingConnected) return 'connecting';

  const statuses = Object.values(peerStatuses);
  if (statuses.some((status) => status.connectionState === 'failed' || status.iceConnectionState === 'failed')) return 'failed';
  if (statuses.some((status) => status.connectionState === 'connected' || status.iceConnectionState === 'connected' || status.iceConnectionState === 'completed')) return 'connected';
  if (statuses.some((status) => status.connectionState === 'disconnected' || status.iceConnectionState === 'disconnected')) return 'disconnected';
  if (statuses.length > 0) return 'connecting';
  return 'connected';
};

export function useWebRTCSession({
  conversationId,
  role,
  participantId = null,
  participants,
  localStream = null,
  enabled = true,
}: UseWebRTCSessionOptions): UseWebRTCSessionResult {
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteCameraStates, setRemoteCameraStates] = useState<Record<string, 'on' | 'off'>>({});
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [peerStatuses, setPeerStatuses] = useState<Record<string, WebRTCPeerStatus>>({});
  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const renegotiationTimersRef = useRef<Map<string, number>>(new Map());
  const iceStallTimersRef = useRef<Map<string, number>>(new Map());
  const cameraReadyTimersRef = useRef<Map<string, number>>(new Map());
  const renegotiatePeerRef = useRef<(peerId: string, options?: PeerNegotiationOptions) => void>(() => undefined);
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const hadLocalStreamRef = useRef(Boolean(localStream));
  const processedSignalKeysRef = useRef<Set<string>>(new Set());
  const hookStartedAtRef = useRef(Date.now());
  const remotePeerIdsRef = useRef<string[]>([]);
  const hasRealtimeSupport = typeof RTCPeerConnection !== 'undefined';

  const localPeerId = useMemo(() => {
    if (role === 'host') return HOST_PEER_ID;
    return participantId !== null && participantId !== undefined ? participantPeerId(participantId) : null;
  }, [participantId, role]);

  const participantIds = useMemo(() => {
    return participants
      .map((participant) => participant.id)
      .filter((id): id is number => Number.isFinite(id));
  }, [participants]);

  const remotePeerIds = useMemo(() => {
    if (!localPeerId) return [];
    const ids = new Set<string>();
    if (role === 'participant') ids.add(HOST_PEER_ID);
    participantIds.forEach((id) => {
      const peerId = participantPeerId(id);
      if (peerId !== localPeerId) ids.add(peerId);
    });
    return Array.from(ids).sort();
  }, [localPeerId, participantIds, role]);

  const updatePeerStatus = useCallback((record: PeerRecord, hasRemoteStream?: boolean) => {
    const { peerId, participantId: remoteParticipantId, connection } = record;
    setPeerStatuses((previous) => ({
      ...previous,
      [peerId]: {
        peerId,
        participantId: remoteParticipantId,
        connectionState: connection.connectionState,
        iceConnectionState: connection.iceConnectionState,
        signalingState: connection.signalingState,
        iceGatheringState: connection.iceGatheringState,
        hasRemoteStream: hasRemoteStream ?? previous[peerId]?.hasRemoteStream ?? false,
        localCandidateTypes: Array.from(record.localCandidateTypes).sort(),
        remoteCandidateTypes: Array.from(record.remoteCandidateTypes).sort(),
        pendingRemoteCandidateCount: pendingCandidatesRef.current.get(peerId)?.length ?? 0,
        receiverTrackStates: connection.getReceivers()
          .map((receiver) => receiver.track)
          .filter((track): track is MediaStreamTrack => Boolean(track))
          .map((track) => `${track.kind}:${track.readyState}${track.enabled ? ':enabled' : ':disabled'}`),
        lastSignalAt: record.lastSignalAt,
        lastIceCandidateAt: record.lastIceCandidateAt,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  const rememberSignal = useCallback((signal: WebRTCSignalPayload, eventId?: number | string | null): boolean => {
    const signalKey = eventId !== undefined && eventId !== null
      ? `row-${eventId}`
      : [
        signal.timestamp,
        signal.signalType,
        signal.fromPeerId,
        signal.toPeerId,
        signal.sdp?.type,
        signal.candidate?.candidate,
      ].filter(Boolean).join('|');

    if (!signalKey) return true;
    const processedKeys = processedSignalKeysRef.current;
    if (processedKeys.has(signalKey)) return false;
    processedKeys.add(signalKey);
    if (processedKeys.size > 500) {
      Array.from(processedKeys).slice(0, 100).forEach((key) => processedKeys.delete(key));
    }
    return true;
  }, []);

  const syncLocalStreamToPeer = useCallback(async (record: PeerRecord, stream: MediaStream | null): Promise<void> => {
    const { connection } = record;
    if (connection.signalingState === 'closed' || connection.connectionState === 'closed') return;

    const videoTrack = stream?.getVideoTracks()[0] ?? null;
    const audioTrack = stream?.getAudioTracks()[0] ?? null;
    let videoTransceiver = record.videoTransceiver;
    if (!videoTransceiver || videoTransceiver.stopped) {
      videoTransceiver = connection.getTransceivers().find((transceiver) => {
        return !transceiver.stopped && (transceiver.sender.track?.kind === 'video' || transceiver.receiver.track?.kind === 'video');
      });
    }

    if (!videoTransceiver) {
      try {
        videoTransceiver = connection.addTransceiver('video', { direction: videoTrack ? 'sendrecv' : 'recvonly' });
      } catch (error) {
        console.warn('Unable to prepare WebRTC video transceiver:', error);
        return;
      }
    }
    record.videoTransceiver = videoTransceiver;

    try {
      await videoTransceiver.sender.replaceTrack(videoTrack);
      const nextDirection = resolveTransceiverDirection(connection, 'video', Boolean(videoTrack));
      if (!videoTransceiver.stopped && videoTransceiver.direction !== nextDirection) {
        videoTransceiver.direction = nextDirection;
      }
      let audioTransceiver = record.audioTransceiver;
      if (!audioTransceiver || audioTransceiver.stopped) {
        audioTransceiver = connection.getTransceivers().find((transceiver) => {
          return !transceiver.stopped && (transceiver.sender.track?.kind === 'audio' || transceiver.receiver.track?.kind === 'audio');
        });
      }

      if (!audioTransceiver) {
        try {
          audioTransceiver = connection.addTransceiver('audio', { direction: audioTrack ? 'sendrecv' : 'recvonly' });
        } catch (error) {
          console.warn('Unable to prepare WebRTC audio transceiver:', error);
          updatePeerStatus(record);
          return;
        }
      }
      record.audioTransceiver = audioTransceiver;

      await audioTransceiver.sender.replaceTrack(audioTrack);
      const nextAudioDirection = resolveTransceiverDirection(connection, 'audio', Boolean(audioTrack));
      if (!audioTransceiver.stopped && audioTransceiver.direction !== nextAudioDirection) {
        audioTransceiver.direction = nextAudioDirection;
      }

      updatePeerStatus(record);
    } catch (error) {
      console.warn('Unable to sync local media tracks to WebRTC peer:', error);
    }
  }, [updatePeerStatus]);

  const enforceAnswerDirectionsForRemoteOffer = useCallback(async (record: PeerRecord, stream: MediaStream | null): Promise<void> => {
    const videoTrack = stream?.getVideoTracks()[0] ?? null;
    const audioTrack = stream?.getAudioTracks()[0] ?? null;

    for (const kind of ['video', 'audio'] as const) {
      const transceiver = kind === 'video' ? record.videoTransceiver : record.audioTransceiver;
      const localTrack = kind === 'video' ? videoTrack : audioTrack;
      if (!transceiver || transceiver.stopped) continue;
      await transceiver.sender.replaceTrack(localTrack);
      const nextDirection = buildInactiveTransceiverDirection(record.connection, kind, Boolean(localTrack));
      if (!transceiver.stopped && transceiver.direction !== nextDirection) {
        transceiver.direction = nextDirection;
      }
    }

    updatePeerStatus(record);
  }, [updatePeerStatus]);

  const syncRemoteReceiverStream = useCallback((
    record: PeerRecord,
    incomingTrack?: MediaStreamTrack | null,
    preferredStream?: MediaStream | null,
  ): boolean => {
    const sourceParticipantId = record.participantId;
    const streamKey = sourceParticipantId === null ? HOST_VIDEO_STREAM_KEY : String(sourceParticipantId);

    const receiverTracks = record.connection.getReceivers()
      .map((receiver) => receiver.track)
      .filter((track): track is MediaStreamTrack => Boolean(track) && track.readyState !== 'ended');
    const remoteTracks = [
      ...receiverTracks,
      ...(incomingTrack && incomingTrack.readyState !== 'ended' ? [incomingTrack] : []),
    ];

    if (remoteTracks.length === 0) return false;

    const stream = preferredStream ?? record.remoteStream ?? new MediaStream();
    remoteTracks.forEach((track) => {
      if (!stream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
        stream.addTrack(track);
      }
    });

    record.remoteStream = stream;
    const hasLiveRemoteVideo = remoteTracks.some((track) => track.kind === 'video' && track.readyState === 'live' && !track.muted);
    setRemoteCameraStates((previous) => {
      const nextState: 'on' | 'off' = hasLiveRemoteVideo ? 'on' : 'off';
      return previous[streamKey] === nextState ? previous : { ...previous, [streamKey]: nextState };
    });
    setRemoteStreams((previous) => {
      if (previous[streamKey] === stream) return previous;
      return { ...previous, [streamKey]: stream };
    });
    updatePeerStatus(record, true);
    return true;
  }, [updatePeerStatus]);

  const removeRemoteStream = useCallback((peerId: string) => {
    const remoteParticipantId = parseParticipantIdFromPeerId(peerId);
    const key = remoteParticipantId === null ? HOST_VIDEO_STREAM_KEY : String(remoteParticipantId);
    setRemoteStreams((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    const record = peersRef.current.get(peerId);
    if (record) updatePeerStatus(record, false);
  }, [updatePeerStatus]);

  const isCurrentPeerRecord = useCallback((peerId: string, record: PeerRecord): boolean => {
    return peersRef.current.get(peerId)?.connection === record.connection
      && record.connection.signalingState !== 'closed'
      && record.connection.connectionState !== 'closed';
  }, []);

  const clearPeerTimers = useCallback((peerId: string) => {
    const renegotiationTimer = renegotiationTimersRef.current.get(peerId);
    if (renegotiationTimer !== undefined) {
      window.clearTimeout(renegotiationTimer);
      renegotiationTimersRef.current.delete(peerId);
    }

    const stallTimer = iceStallTimersRef.current.get(peerId);
    if (stallTimer !== undefined) {
      window.clearTimeout(stallTimer);
      iceStallTimersRef.current.delete(peerId);
    }
  }, []);

  const schedulePeerRenegotiation = useCallback((peerId: string, options: PeerNegotiationOptions = {}) => {
    const existingTimer = renegotiationTimersRef.current.get(peerId);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);

    const timerId = window.setTimeout(() => {
      renegotiationTimersRef.current.delete(peerId);
      const record = peersRef.current.get(peerId);
      if (!record || record.connection.signalingState === 'closed' || record.connection.connectionState === 'closed') return;
      // A normal camera-ready renegotiation changes SDP track direction only.
      // Restarting ICE for every such offer invalidates in-flight candidates and
      // was causing same-Wi-Fi peers to fall into reconnect-needed loops.
      if (options.iceRestart) record.connection.restartIce?.();
      renegotiatePeerRef.current(peerId, options);
    }, WEBRTC_ICE_RENEGOTIATION_DELAY_MS);

    renegotiationTimersRef.current.set(peerId, timerId);
  }, []);

  const armIceStallTimer = useCallback((record: PeerRecord) => {
    const { peerId, connection } = record;
    const existingTimer = iceStallTimersRef.current.get(peerId);
    if (existingTimer !== undefined) window.clearTimeout(existingTimer);

    if (connection.iceConnectionState !== 'checking' && connection.iceConnectionState !== 'disconnected') {
      iceStallTimersRef.current.delete(peerId);
      return;
    }

    const timerId = window.setTimeout(() => {
      iceStallTimersRef.current.delete(peerId);
      if (!isCurrentPeerRecord(peerId, record)) return;
      if (connection.iceConnectionState === 'connected' || connection.iceConnectionState === 'completed') return;
      schedulePeerRenegotiation(peerId, { iceRestart: true });
    }, WEBRTC_ICE_STALL_TIMEOUT_MS);

    iceStallTimersRef.current.set(peerId, timerId);
  }, [isCurrentPeerRecord, schedulePeerRenegotiation]);

  const cleanupStaleSignals = useCallback(async () => {
    // Participant join tokens may publish only the narrow signaling event; the
    // host owns retention cleanup for the shared signaling log.
    if (!conversationId || role !== 'host') return;
    const cutoff = new Date(Date.now() - WEBRTC_SIGNAL_RETENTION_MS).toISOString();
    const { error } = await api
      .from('session_events')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('event_type', WEBRTC_EVENT_TYPE)
      .lt('created_at', cutoff);

    if (error) {
      console.warn('Unable to clean up stale WebRTC signals:', error.message);
    }
  }, [conversationId, role]);

  const sendSignal = useCallback(async (toPeerId: string, signal: Omit<WebRTCSignalPayload, 'kind' | 'version' | 'conversationId' | 'fromPeerId' | 'fromParticipantId' | 'toPeerId' | 'timestamp'>): Promise<boolean> => {
    if (!conversationId || !localPeerId) return false;
    const payload: WebRTCSignalPayload = {
      kind: 'webrtc_signal',
      version: 1,
      conversationId,
      fromPeerId: localPeerId,
      fromParticipantId: role === 'participant' ? participantId ?? parseParticipantIdFromPeerId(localPeerId) : null,
      toPeerId,
      timestamp: new Date().toISOString(),
      ...signal,
    };

    const isCriticalSignal = signal.signalType === 'offer' || signal.signalType === 'answer';
    const maxAttempts = isCriticalSignal ? WEBRTC_SIGNAL_CRITICAL_RETRY_COUNT : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const { error } = await api.from('session_events').insert({
        conversation_id: conversationId,
        event_type: WEBRTC_EVENT_TYPE,
        data: payload,
      });

      if (!error) return true;
      if (attempt >= maxAttempts) {
        console.warn('Unable to send WebRTC signal:', error.message);
        return false;
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, WEBRTC_SIGNAL_CRITICAL_RETRY_DELAY_MS * attempt);
      });
    }

    return false;
  }, [conversationId, localPeerId, participantId, role]);

  const isLocalOffererForPeer = useCallback((peerId: string): boolean => {
    if (!localPeerId) return false;
    if (role === 'participant' && peerId === HOST_PEER_ID) return true;
    if (role === 'host' && peerId !== HOST_PEER_ID) return false;
    return localPeerId.localeCompare(peerId) < 0;
  }, [localPeerId, role]);

  const flushPendingCandidates = useCallback(async (peerId: string, connection: RTCPeerConnection) => {
    if (!connection.remoteDescription) return;
    const pending = pendingCandidatesRef.current.get(peerId) ?? [];
    if (pending.length === 0) return;
    pendingCandidatesRef.current.delete(peerId);

    for (const candidate of pending) {
      try {
        await connection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn('Unable to apply queued WebRTC ICE candidate:', error);
      }
    }
  }, []);

  const getOrCreatePeer = useCallback((peerId: string): PeerRecord | null => {
    if (!localPeerId) return null;
    const existing = peersRef.current.get(peerId);
    if (existing && existing.connection.connectionState !== 'closed') return existing;

    const connection = new RTCPeerConnection(ICE_CONFIGURATION);
    const remoteParticipantId = parseParticipantIdFromPeerId(peerId);
    const record: PeerRecord = {
      peerId,
      participantId: remoteParticipantId,
      connection,
      localCandidateTypes: new Set<string>(),
      remoteCandidateTypes: new Set<string>(),
      lastSignalAt: null,
      lastIceCandidateAt: null,
    };
    peersRef.current.set(peerId, record);
    updatePeerStatus(record);

    if (isLocalOffererForPeer(peerId)) {
      void syncLocalStreamToPeer(record, localStreamRef.current);
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateType = extractCandidateType(event.candidate);
        if (candidateType) record.localCandidateTypes.add(candidateType);
        record.lastIceCandidateAt = new Date().toISOString();
        updatePeerStatus(record);
        void sendSignal(peerId, {
          signalType: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      } else {
        updatePeerStatus(record);
      }
    };

    connection.ontrack = (event) => {
      const [providedStream] = event.streams;
      syncRemoteReceiverStream(record, event.track, providedStream ?? null);
    };

    const handleConnectionStateChange = () => {
      const hasReceiverStream = syncRemoteReceiverStream(record);
      if (!hasReceiverStream) updatePeerStatus(record);
      if (connection.connectionState === 'connected' || connection.iceConnectionState === 'connected' || connection.iceConnectionState === 'completed') {
        clearPeerTimers(peerId);
        return;
      }
      if (connection.connectionState === 'failed' || connection.iceConnectionState === 'failed') {
        schedulePeerRenegotiation(peerId, { iceRestart: true });
      }
      if (connection.connectionState === 'disconnected' || connection.iceConnectionState === 'disconnected') {
        removeRemoteStream(peerId);
        schedulePeerRenegotiation(peerId, { iceRestart: true });
      }
      armIceStallTimer(record);
    };

    connection.onconnectionstatechange = handleConnectionStateChange;
    connection.oniceconnectionstatechange = handleConnectionStateChange;
    connection.onsignalingstatechange = () => {
      const hasReceiverStream = syncRemoteReceiverStream(record);
      if (!hasReceiverStream) updatePeerStatus(record);
    };

    return record;
  }, [armIceStallTimer, clearPeerTimers, isLocalOffererForPeer, localPeerId, removeRemoteStream, schedulePeerRenegotiation, sendSignal, syncLocalStreamToPeer, syncRemoteReceiverStream, updatePeerStatus]);

  const closePeer = useCallback((peerId: string) => {
    const record = peersRef.current.get(peerId);
    if (!record) return;
    record.connection.onicecandidate = null;
    record.connection.ontrack = null;
    record.connection.onconnectionstatechange = null;
    record.connection.oniceconnectionstatechange = null;
    record.connection.onsignalingstatechange = null;
    record.connection.close();
    peersRef.current.delete(peerId);
    pendingCandidatesRef.current.delete(peerId);
    clearPeerTimers(peerId);
    setPeerStatuses((previous) => {
      if (!previous[peerId]) return previous;
      const next = { ...previous };
      delete next[peerId];
      return next;
    });
    removeRemoteStream(peerId);
  }, [clearPeerTimers, removeRemoteStream]);

  useEffect(() => {
    localStreamRef.current = localStream;
    peersRef.current.forEach((record, peerId) => {
      void syncLocalStreamToPeer(record, localStream).then(() => {
        if (isLocalOffererForPeer(peerId)) {
          schedulePeerRenegotiation(peerId);
          return;
        }
        // The host deliberately is not the SDP offerer for a participant peer.
        // When the host turns its camera on after the original negotiation, tell
        // the participant offerer to create a fresh offer so the host track is
        // included in the answer and Android can receive actual camera frames.
        void sendSignal(peerId, { signalType: 'camera-ready' });
      });
    });
  }, [isLocalOffererForPeer, localStream, schedulePeerRenegotiation, sendSignal, syncLocalStreamToPeer]);

  const createOffer = useCallback(async (peerId: string, options: PeerNegotiationOptions = {}) => {
    if (!isLocalOffererForPeer(peerId)) return;
    const record = getOrCreatePeer(peerId);
    if (!record || record.connection.signalingState !== 'stable') return;
    if (record.offerInProgress) {
      record.queuedRenegotiation = { ...record.queuedRenegotiation, ...options };
      return;
    }

    record.offerInProgress = true;
    try {
      await syncLocalStreamToPeer(record, localStreamRef.current);
      if (!isCurrentPeerRecord(peerId, record) || record.connection.signalingState !== 'stable') return;
      const offer = await record.connection.createOffer({
        ...(options.iceRestart ? { iceRestart: true } : {}),
      });
      if (!isCurrentPeerRecord(peerId, record)) return;
      await record.connection.setLocalDescription(offer);
      if (!isCurrentPeerRecord(peerId, record)) return;
      updatePeerStatus(record);
      if (record.connection.localDescription) {
        await sendSignal(peerId, {
          signalType: 'offer',
          sdp: record.connection.localDescription.toJSON(),
        });
      }
    } catch (error) {
      console.warn('Unable to create WebRTC offer:', error);
      if (isCurrentPeerRecord(peerId, record)) updatePeerStatus(record);
    } finally {
      record.offerInProgress = false;
      const queuedRenegotiation = record.queuedRenegotiation;
      record.queuedRenegotiation = undefined;
      if (queuedRenegotiation && isCurrentPeerRecord(peerId, record)) {
        schedulePeerRenegotiation(peerId, queuedRenegotiation);
      }
    }
  }, [getOrCreatePeer, isCurrentPeerRecord, isLocalOffererForPeer, schedulePeerRenegotiation, sendSignal, syncLocalStreamToPeer, updatePeerStatus]);

  useEffect(() => {
    renegotiatePeerRef.current = createOffer;
  }, [createOffer]);

  const handleSignal = useCallback(async (signal: WebRTCSignalPayload, eventId?: number | string | null) => {
    if (!conversationId || signal.conversationId !== conversationId || signal.toPeerId !== localPeerId || signal.fromPeerId === localPeerId) {
      return;
    }
    if (!rememberSignal(signal, eventId)) return;

    if (signal.signalType === 'camera-stopped') {
      if (isSignalOlderThan(signal, WEBRTC_SIGNAL_CATCHUP_LOOKBACK_MS)) return;
      const remoteParticipantId = parseParticipantIdFromPeerId(signal.fromPeerId);
      const streamKey = remoteParticipantId === null ? HOST_VIDEO_STREAM_KEY : String(remoteParticipantId);
      const staleTimer = cameraReadyTimersRef.current.get(streamKey);
      if (staleTimer) window.clearTimeout(staleTimer);
      cameraReadyTimersRef.current.delete(streamKey);
      setRemoteCameraStates((previous) => previous[streamKey] === 'off' ? previous : { ...previous, [streamKey]: 'off' });
      removeRemoteStream(signal.fromPeerId);
      return;
    }

    if (signal.signalType === 'camera-ready') {
      if (isSignalOlderThan(signal, WEBRTC_SIGNAL_MAX_CAMERA_AGE_MS)) return;
      const remoteParticipantId = parseParticipantIdFromPeerId(signal.fromPeerId);
      const streamKey = remoteParticipantId === null ? HOST_VIDEO_STREAM_KEY : String(remoteParticipantId);
      const staleTimer = cameraReadyTimersRef.current.get(streamKey);
      if (staleTimer) window.clearTimeout(staleTimer);
      setRemoteCameraStates((previous) => previous[streamKey] === 'on' ? previous : { ...previous, [streamKey]: 'on' });
      const timerId = window.setTimeout(() => {
        const peer = peersRef.current.get(signal.fromPeerId);
        const hasLiveVideo = Boolean(peer?.remoteStream?.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted));
        if (!hasLiveVideo) {
          setRemoteCameraStates((previous) => previous[streamKey] === 'on' ? { ...previous, [streamKey]: 'off' } : previous);
        }
        cameraReadyTimersRef.current.delete(streamKey);
      }, WEBRTC_CAMERA_READY_STALE_MS);
      cameraReadyTimersRef.current.set(streamKey, timerId);
      if (isLocalOffererForPeer(signal.fromPeerId)) {
        schedulePeerRenegotiation(signal.fromPeerId);
      }
      return;
    }

    if (signal.signalType === 'reconnect-request') {
      // A user explicitly requested one clean recovery attempt. The designated
      // participant offerer owns the fresh ICE generation; the host simply
      // clears its stale answerer peer and waits for that offer.
      closePeer(signal.fromPeerId);
      if (isLocalOffererForPeer(signal.fromPeerId)) {
        window.setTimeout(() => {
          void createOffer(signal.fromPeerId, { iceRestart: true });
        }, 0);
      }
      return;
    }

    const record = getOrCreatePeer(signal.fromPeerId);
    if (!record) return;

    try {
      if (signal.signalType === 'offer' && signal.sdp) {
        if (record.connection.signalingState !== 'stable') {
          if (isLocalOffererForPeer(signal.fromPeerId)) return;
          try {
            await record.connection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
          } catch {
            // Some browsers reject rollback when no local offer exists; continuing lets the next guard handle it.
          }
        }
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        record.lastSignalAt = new Date().toISOString();
        await record.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        syncRemoteReceiverStream(record);
        await syncLocalStreamToPeer(record, localStreamRef.current);
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        await enforceAnswerDirectionsForRemoteOffer(record, localStreamRef.current);
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        await flushPendingCandidates(signal.fromPeerId, record.connection);
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        const answer = await record.connection.createAnswer();
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        await record.connection.setLocalDescription(answer);
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        syncRemoteReceiverStream(record);
        updatePeerStatus(record);
        if (record.connection.localDescription) {
          await sendSignal(signal.fromPeerId, {
            signalType: 'answer',
            sdp: record.connection.localDescription.toJSON(),
          });
        }
        return;
      }

      if (signal.signalType === 'answer' && signal.sdp) {
        if (record.connection.signalingState !== 'have-local-offer') {
          record.lastSignalAt = new Date().toISOString();
          syncRemoteReceiverStream(record);
          updatePeerStatus(record);
          return;
        }

        record.lastSignalAt = new Date().toISOString();
        await record.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        syncRemoteReceiverStream(record);
        await flushPendingCandidates(signal.fromPeerId, record.connection);
        if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
        updatePeerStatus(record);
        return;
      }

      if (signal.signalType === 'ice-candidate' && signal.candidate) {
        const candidateType = extractCandidateType(signal.candidate);
        if (candidateType) record.remoteCandidateTypes.add(candidateType);
        record.lastSignalAt = new Date().toISOString();
        if (record.connection.remoteDescription) {
          await record.connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          if (!isCurrentPeerRecord(signal.fromPeerId, record)) return;
          updatePeerStatus(record);
        } else {
          const pending = pendingCandidatesRef.current.get(signal.fromPeerId) ?? [];
          pending.push(signal.candidate);
          pendingCandidatesRef.current.set(signal.fromPeerId, pending);
          updatePeerStatus(record);
        }
      }
    } catch (error) {
      if (isIgnorableStaleSignalError(error)) {
        console.debug('Ignoring stale WebRTC signal from a previous ICE generation:', error);
        return;
      }
      if (isIncompatibleSessionDescriptionError(error)) {
        console.warn('Resetting incompatible WebRTC peer after SDP direction mismatch:', error);
        closePeer(signal.fromPeerId);
        if (isLocalOffererForPeer(signal.fromPeerId)) schedulePeerRenegotiation(signal.fromPeerId);
        return;
      }
      console.warn('Unable to process WebRTC signal:', error);
      updatePeerStatus(record);
    }
  }, [closePeer, conversationId, createOffer, enforceAnswerDirectionsForRemoteOffer, flushPendingCandidates, getOrCreatePeer, isCurrentPeerRecord, isLocalOffererForPeer, localPeerId, rememberSignal, removeRemoteStream, schedulePeerRenegotiation, sendSignal, syncLocalStreamToPeer, syncRemoteReceiverStream, updatePeerStatus]);

  const retryConnection = useCallback(() => {
    remotePeerIdsRef.current.forEach((peerId) => {
      closePeer(peerId);
      void sendSignal(peerId, { signalType: 'reconnect-request' });
      if (isLocalOffererForPeer(peerId)) {
        window.setTimeout(() => {
          void createOffer(peerId, { iceRestart: true });
        }, 0);
      }
    });
  }, [closePeer, createOffer, isLocalOffererForPeer, sendSignal]);

  const catchUpRecentSignals = useCallback(async () => {
    if (!conversationId || !localPeerId) return;
    const catchupCutoff = new Date(Math.max(
      hookStartedAtRef.current - WEBRTC_SIGNAL_CATCHUP_LOOKBACK_MS,
      Date.now() - WEBRTC_SIGNAL_CATCHUP_LOOKBACK_MS,
    )).toISOString();

    const { data, error } = await api
      .from<SessionEventRow>('session_events')
      .select('id,conversation_id,event_type,data,created_at')
      .eq('conversation_id', conversationId)
      .eq('event_type', WEBRTC_EVENT_TYPE)
      .gte('created_at', catchupCutoff)
      .order('created_at', { ascending: false })
      .limit(WEBRTC_SIGNAL_CATCHUP_LIMIT);

    if (error) {
      console.warn('Unable to catch up WebRTC signals:', error.message);
      return;
    }

    const rows = Array.isArray(data) ? [...data].reverse() : [];
    for (const row of rows) {
      const signal = row.data;
      if (!isSignalPayload(signal)) continue;
      await handleSignal(signal, row.id ?? null);
    }
  }, [conversationId, handleSignal, localPeerId]);

  useEffect(() => {
    remotePeerIdsRef.current = remotePeerIds;
  }, [remotePeerIds]);

  useEffect(() => {
    if (!enabled || !conversationId || !localPeerId || !hasRealtimeSupport) {
      setIsSignalingConnected(false);
      return;
    }

    void cleanupStaleSignals();
    const cleanupTimer = window.setInterval(() => {
      void cleanupStaleSignals();
    }, WEBRTC_SIGNAL_CLEANUP_INTERVAL_MS);
    void catchUpRecentSignals();
    const catchupTimer = window.setInterval(() => {
      void catchUpRecentSignals();
    }, WEBRTC_SIGNAL_CATCHUP_INTERVAL_MS);

    const channel = api
      .channel(`webrtc-signals-${conversationId}-${localPeerId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'session_events',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload: RealtimePayload<SessionEventRow>) => {
        if (payload.new?.event_type !== WEBRTC_EVENT_TYPE) return;
        const data = payload.new.data;
        if (!isSignalPayload(data)) return;
        void handleSignal(data, payload.new.id ?? null);
      })
      .subscribe((status) => {
        setIsSignalingConnected(status === 'SUBSCRIBED');
      });

    return () => {
      window.clearInterval(cleanupTimer);
      window.clearInterval(catchupTimer);
      removeChannel(channel);
      setIsSignalingConnected(false);
    };
  }, [catchUpRecentSignals, cleanupStaleSignals, conversationId, enabled, handleSignal, hasRealtimeSupport, localPeerId]);

  useEffect(() => {
    if (!enabled || !conversationId || !localPeerId || !hasRealtimeSupport) return;

    // Hosts are answerers for participant peers. They must not emit repeated
    // readiness signals during initial room setup because every participant
    // already owns the first offer. A host camera toggled after a peer exists is
    // handled separately by the local-stream effect above.
    if (role === 'host') return;

    let attempts = 0;
    const createInitialOffer = () => {
      attempts += 1;
      remotePeerIds.forEach((peerId) => {
        if (!isLocalOffererForPeer(peerId)) return;
        const record = peersRef.current.get(peerId);
        // Retry once only when no remote signal has arrived. This prevents a
        // second normal offer from replacing an active same-Wi-Fi negotiation.
        if (attempts > 1 && record?.lastSignalAt) return;
        void createOffer(peerId);
      });
    };

    createInitialOffer();
    const retryTimer = window.setTimeout(() => {
      if (attempts < WEBRTC_CAMERA_READY_BURST_COUNT) createInitialOffer();
    }, WEBRTC_CAMERA_READY_BURST_INTERVAL_MS);

    return () => window.clearTimeout(retryTimer);
  }, [conversationId, createOffer, enabled, hasRealtimeSupport, isLocalOffererForPeer, localPeerId, remotePeerIds, role]);

  useEffect(() => {
    const activeRemotePeers = new Set(remotePeerIds);
    Array.from(peersRef.current.keys()).forEach((peerId) => {
      if (!activeRemotePeers.has(peerId)) closePeer(peerId);
    });
  }, [closePeer, remotePeerIds]);

  useEffect(() => {
    const hadLocalStream = hadLocalStreamRef.current;
    hadLocalStreamRef.current = Boolean(localStream);
    if (!enabled || !conversationId || !localPeerId || localStream || !hadLocalStream) return;
    remotePeerIdsRef.current.forEach((peerId) => {
      void sendSignal(peerId, { signalType: 'camera-stopped' });
    });
  }, [conversationId, enabled, localPeerId, localStream, sendSignal]);

  // The host announces initial camera availability when participant peers appear.
  // Without this state signal, a participant with no remote frames cannot tell a
  // deliberately-off host camera from an endlessly connecting WebRTC session.
  const remotePeerIdsKey = remotePeerIds.join('|');
  useEffect(() => {
    if (!enabled || !conversationId || role !== 'host' || !localPeerId) return;
    const signalType: WebRTCSignalType = localStream ? 'camera-ready' : 'camera-stopped';
    remotePeerIds.forEach((peerId) => {
      void sendSignal(peerId, { signalType });
    });
  }, [conversationId, enabled, localPeerId, localStream, remotePeerIds, remotePeerIdsKey, role, sendSignal]);

  useEffect(() => {
    const peers = peersRef.current;
    const pendingCandidates = pendingCandidatesRef.current;
    const renegotiationTimers = renegotiationTimersRef.current;
    const iceStallTimers = iceStallTimersRef.current;
    const cameraReadyTimers = cameraReadyTimersRef.current;
    return () => {
      if (conversationId && localPeerId) {
        remotePeerIdsRef.current.forEach((peerId) => {
          void sendSignal(peerId, { signalType: 'camera-stopped' });
        });
      }
      peers.forEach((record) => record.connection.close());
      peers.clear();
      pendingCandidates.clear();
      renegotiationTimers.forEach((timerId) => window.clearTimeout(timerId));
      renegotiationTimers.clear();
      iceStallTimers.forEach((timerId) => window.clearTimeout(timerId));
      iceStallTimers.clear();
      cameraReadyTimers.forEach((timerId) => window.clearTimeout(timerId));
      cameraReadyTimers.clear();
      setPeerStatuses({});
      setRemoteStreams({});
      setRemoteCameraStates({});
    };
  }, [conversationId, localPeerId, sendSignal]);

  const connectionStatus = useMemo(() => {
    return summarizeConnectionStatus(enabled, hasRealtimeSupport, isSignalingConnected, peerStatuses);
  }, [enabled, hasRealtimeSupport, isSignalingConnected, peerStatuses]);

  const diagnostics = useMemo<WebRTCDiagnostics>(() => ({
    localPeerId,
    remotePeerIds,
    hasRealtimeSupport,
    isSignalingConnected,
    localStream: summarizeStream(localStream),
    remoteStreamCount: Object.keys(remoteStreams).length,
    iceServers: describeIceServers(ICE_CONFIGURATION.iceServers),
  }), [hasRealtimeSupport, isSignalingConnected, localPeerId, localStream, remotePeerIds, remoteStreams]);

  return {
    remoteStreams,
    remoteCameraStates,
    isSignalingConnected,
    connectionStatus,
    peerStatuses,
    activePeerCount: Object.keys(peerStatuses).length,
    diagnostics,
    retryConnection,
  };
}

export default useWebRTCSession;
