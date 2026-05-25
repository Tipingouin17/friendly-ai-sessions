/**
 * useWebRTCSession
 *
 * Client-side WebRTC room helper for the light session shells. The current
 * backend exposes database-change realtime channels, not native broadcast or
 * presence channels, so signaling is encoded as short-lived `session_events`
 * rows with `event_type = 'webrtc_signal'`.
 *
 * Participants publish their local camera stream by creating one peer
 * connection per viewer (host + other participants). Viewers answer incoming
 * offers and keep the received MediaStreams in a participant-id keyed map for
 * the video grid. Hosts are receive-only for now; participants can both publish
 * their own camera and receive peer participant cameras.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { type RealtimePayload } from '@/lib/api';
import { removeChannel } from '@/utils/realtimeHelpers';
import type { ParticipantInfo } from '@/types/chat';

export type WebRTCRole = 'host' | 'participant';
export type WebRTCSignalType = 'offer' | 'answer' | 'ice-candidate' | 'camera-ready' | 'camera-stopped';
export type WebRTCConnectionStatus = 'idle' | 'unsupported' | 'connecting' | 'connected' | 'disconnected' | 'failed';

export interface WebRTCPeerStatus {
  peerId: string;
  participantId: number | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  hasRemoteStream: boolean;
  updatedAt: string;
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
  isSignalingConnected: boolean;
  connectionStatus: WebRTCConnectionStatus;
  peerStatuses: Record<string, WebRTCPeerStatus>;
  activePeerCount: number;
}

interface PeerRecord {
  peerId: string;
  participantId: number | null;
  connection: RTCPeerConnection;
}

const WEBRTC_EVENT_TYPE = 'webrtc_signal';
const HOST_PEER_ID = 'host';
const WEBRTC_SIGNAL_RETENTION_MS = 30 * 60 * 1000;
const WEBRTC_SIGNAL_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const WEBRTC_CAMERA_READY_BURST_COUNT = 6;
const WEBRTC_CAMERA_READY_BURST_INTERVAL_MS = 2_000;
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

const participantPeerId = (participantId: number): string => `participant-${participantId}`;
const parseParticipantIdFromPeerId = (peerId: string): number | null => {
  const match = peerId.match(/^participant-(\d+)$/);
  return match ? Number(match[1]) : null;
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
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [peerStatuses, setPeerStatuses] = useState<Record<string, WebRTCPeerStatus>>({});
  const peersRef = useRef<Map<string, PeerRecord>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const hadLocalStreamRef = useRef(Boolean(localStream));
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
        hasRemoteStream: hasRemoteStream ?? previous[peerId]?.hasRemoteStream ?? false,
        updatedAt: new Date().toISOString(),
      },
    }));
  }, []);

  useEffect(() => {
    localStreamRef.current = localStream;
    peersRef.current.forEach((record) => {
      const { connection } = record;
      const senders = connection.getSenders().filter((sender) => sender.track);
      senders.forEach((sender) => connection.removeTrack(sender));
      if (localStream) {
        localStream.getTracks().forEach((track) => connection.addTrack(track, localStream));
      }
      updatePeerStatus(record);
    });
  }, [localStream, updatePeerStatus]);

  const removeRemoteStream = useCallback((peerId: string) => {
    const remoteParticipantId = parseParticipantIdFromPeerId(peerId);
    if (remoteParticipantId === null) return;
    setRemoteStreams((previous) => {
      const key = String(remoteParticipantId);
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
    const record = peersRef.current.get(peerId);
    if (record) updatePeerStatus(record, false);
  }, [updatePeerStatus]);

  const cleanupStaleSignals = useCallback(async () => {
    if (!conversationId) return;
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
  }, [conversationId]);

  const sendSignal = useCallback(async (toPeerId: string, signal: Omit<WebRTCSignalPayload, 'kind' | 'version' | 'conversationId' | 'fromPeerId' | 'fromParticipantId' | 'toPeerId' | 'timestamp'>) => {
    if (!conversationId || !localPeerId) return;
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

    const { error } = await api.from('session_events').insert({
      conversation_id: conversationId,
      event_type: WEBRTC_EVENT_TYPE,
      data: payload,
    });

    if (error) {
      console.warn('Unable to send WebRTC signal:', error.message);
    }
  }, [conversationId, localPeerId, participantId, role]);

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
    const record: PeerRecord = { peerId, participantId: remoteParticipantId, connection };
    peersRef.current.set(peerId, record);
    updatePeerStatus(record);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        connection.addTrack(track, localStreamRef.current as MediaStream);
      });
    } else {
      try {
        connection.addTransceiver('video', { direction: 'recvonly' });
      } catch (error) {
        console.warn('Unable to add receive-only WebRTC video transceiver:', error);
      }
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        void sendSignal(peerId, {
          signalType: 'ice-candidate',
          candidate: event.candidate.toJSON(),
        });
      }
    };

    connection.ontrack = (event) => {
      const sourceParticipantId = remoteParticipantId;
      if (sourceParticipantId === null) return;
      const [stream] = event.streams;
      if (!stream) return;
      setRemoteStreams((previous) => {
        const key = String(sourceParticipantId);
        if (previous[key] === stream) return previous;
        return { ...previous, [key]: stream };
      });
      updatePeerStatus(record, true);
    };

    const handleConnectionStateChange = () => {
      updatePeerStatus(record);
      if (connection.connectionState === 'failed') {
        connection.restartIce?.();
      }
      if (connection.connectionState === 'closed' || connection.connectionState === 'disconnected') {
        removeRemoteStream(peerId);
      }
    };

    connection.onconnectionstatechange = handleConnectionStateChange;
    connection.oniceconnectionstatechange = handleConnectionStateChange;
    connection.onsignalingstatechange = () => updatePeerStatus(record);

    return record;
  }, [localPeerId, removeRemoteStream, sendSignal, updatePeerStatus]);

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
    setPeerStatuses((previous) => {
      if (!previous[peerId]) return previous;
      const next = { ...previous };
      delete next[peerId];
      return next;
    });
    removeRemoteStream(peerId);
  }, [removeRemoteStream]);

  const isLocalOffererForPeer = useCallback((peerId: string): boolean => {
    if (!localPeerId) return false;
    return localPeerId.localeCompare(peerId) < 0;
  }, [localPeerId]);

  const createOffer = useCallback(async (peerId: string) => {
    const record = getOrCreatePeer(peerId);
    if (!record || record.connection.signalingState !== 'stable') return;
    try {
      const offer = await record.connection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await record.connection.setLocalDescription(offer);
      updatePeerStatus(record);
      if (record.connection.localDescription) {
        await sendSignal(peerId, {
          signalType: 'offer',
          sdp: record.connection.localDescription.toJSON(),
        });
      }
    } catch (error) {
      console.warn('Unable to create WebRTC offer:', error);
      closePeer(peerId);
    }
  }, [closePeer, getOrCreatePeer, sendSignal, updatePeerStatus]);

  const handleSignal = useCallback(async (signal: WebRTCSignalPayload) => {
    if (!conversationId || signal.conversationId !== conversationId || signal.toPeerId !== localPeerId || signal.fromPeerId === localPeerId) {
      return;
    }

    if (signal.signalType === 'camera-stopped') {
      removeRemoteStream(signal.fromPeerId);
      return;
    }

    if (signal.signalType === 'camera-ready') {
      if (isLocalOffererForPeer(signal.fromPeerId)) {
        void createOffer(signal.fromPeerId);
      }
      return;
    }

    const record = getOrCreatePeer(signal.fromPeerId);
    if (!record) return;

    try {
      if (signal.signalType === 'offer' && signal.sdp) {
        await record.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await flushPendingCandidates(signal.fromPeerId, record.connection);
        const answer = await record.connection.createAnswer();
        await record.connection.setLocalDescription(answer);
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
        if (!record.connection.currentRemoteDescription) {
          await record.connection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await flushPendingCandidates(signal.fromPeerId, record.connection);
          updatePeerStatus(record);
        }
        return;
      }

      if (signal.signalType === 'ice-candidate' && signal.candidate) {
        if (record.connection.remoteDescription) {
          await record.connection.addIceCandidate(new RTCIceCandidate(signal.candidate));
          updatePeerStatus(record);
        } else {
          const pending = pendingCandidatesRef.current.get(signal.fromPeerId) ?? [];
          pending.push(signal.candidate);
          pendingCandidatesRef.current.set(signal.fromPeerId, pending);
        }
      }
    } catch (error) {
      console.warn('Unable to process WebRTC signal:', error);
      updatePeerStatus(record);
    }
  }, [conversationId, createOffer, flushPendingCandidates, getOrCreatePeer, isLocalOffererForPeer, localPeerId, removeRemoteStream, sendSignal, updatePeerStatus]);

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
        void handleSignal(data);
      })
      .subscribe((status) => {
        setIsSignalingConnected(status === 'SUBSCRIBED');
      });

    return () => {
      window.clearInterval(cleanupTimer);
      removeChannel(channel);
      setIsSignalingConnected(false);
    };
  }, [cleanupStaleSignals, conversationId, enabled, handleSignal, hasRealtimeSupport, localPeerId]);

  useEffect(() => {
    if (!enabled || !conversationId || !localPeerId || !localStream || !hasRealtimeSupport) return;

    let readyBurstsSent = 0;
    const announceCameraReady = () => {
      readyBurstsSent += 1;
      remotePeerIds.forEach((peerId) => {
        if (isLocalOffererForPeer(peerId)) {
          void createOffer(peerId);
        } else {
          void sendSignal(peerId, { signalType: 'camera-ready' });
        }
      });
    };

    announceCameraReady();
    const readyTimer = window.setInterval(() => {
      if (readyBurstsSent >= WEBRTC_CAMERA_READY_BURST_COUNT) {
        window.clearInterval(readyTimer);
        return;
      }
      announceCameraReady();
    }, WEBRTC_CAMERA_READY_BURST_INTERVAL_MS);

    return () => window.clearInterval(readyTimer);
  }, [conversationId, createOffer, enabled, hasRealtimeSupport, isLocalOffererForPeer, localPeerId, localStream, remotePeerIds, sendSignal]);

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

  useEffect(() => {
    const peers = peersRef.current;
    const pendingCandidates = pendingCandidatesRef.current;
    return () => {
      if (conversationId && localPeerId) {
        remotePeerIdsRef.current.forEach((peerId) => {
          void sendSignal(peerId, { signalType: 'camera-stopped' });
        });
      }
      peers.forEach((record) => record.connection.close());
      peers.clear();
      pendingCandidates.clear();
      setPeerStatuses({});
      setRemoteStreams({});
    };
  }, [conversationId, localPeerId, sendSignal]);

  const connectionStatus = useMemo(() => {
    return summarizeConnectionStatus(enabled, hasRealtimeSupport, isSignalingConnected, peerStatuses);
  }, [enabled, hasRealtimeSupport, isSignalingConnected, peerStatuses]);

  return {
    remoteStreams,
    isSignalingConnected,
    connectionStatus,
    peerStatuses,
    activePeerCount: Object.keys(peerStatuses).length,
  };
}

export default useWebRTCSession;
