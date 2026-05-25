import type { WebRTCDiagnostics, WebRTCPeerStatus } from '@/hooks/useWebRTCSession';

interface WebRTCDiagnosticsPanelProps {
  title?: string;
  diagnostics: WebRTCDiagnostics;
  peerStatuses: Record<string, WebRTCPeerStatus>;
  connectionStatus: string;
  activePeerCount: number;
  className?: string;
}

const formatList = (items: string[], fallback = 'none'): string => {
  return items.length > 0 ? items.join(', ') : fallback;
};

const formatIceServer = (server: WebRTCDiagnostics['iceServers'][number]): string => {
  const urls = server.urls.map((url) => url.replace(/^turns?:\/\//, 'turn://')).join(', ');
  const authLabel = server.hasUsername || server.hasCredential ? 'auth' : 'no auth';
  return `${urls} (${authLabel})`;
};

export function WebRTCDiagnosticsPanel({
  title = 'Video diagnostics',
  diagnostics,
  peerStatuses,
  connectionStatus,
  activePeerCount,
  className = '',
}: WebRTCDiagnosticsPanelProps) {
  const peers = Object.values(peerStatuses).sort((first, second) => first.peerId.localeCompare(second.peerId));
  const hasTurn = diagnostics.iceServers.some((server) => server.urls.some((url) => url.startsWith('turn:') || url.startsWith('turns:')));

  return (
    <details className={`rounded-2xl border border-slate-200 bg-white/90 text-xs text-slate-700 shadow-sm ${className}`} open>
      <summary className="cursor-pointer select-none px-3 py-2 font-bold text-slate-950">
        {title} · {connectionStatus} · {activePeerCount} peer{activePeerCount === 1 ? '' : 's'}
      </summary>
      <div className="space-y-2 border-t border-slate-200 px-3 py-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="font-semibold text-slate-900">Local peer:</span> {diagnostics.localPeerId ?? 'not ready'}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Signaling:</span> {diagnostics.isSignalingConnected ? 'subscribed' : 'connecting'}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Local stream:</span> {diagnostics.localStream.hasStream ? `${diagnostics.localStream.videoTracks} video, ${diagnostics.localStream.audioTracks} audio` : 'none'}
          </div>
          <div>
            <span className="font-semibold text-slate-900">Remote streams:</span> {diagnostics.remoteStreamCount}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
          <div><span className="font-semibold text-slate-900">Remote peer IDs:</span> {formatList(diagnostics.remotePeerIds)}</div>
          <div><span className="font-semibold text-slate-900">Track states:</span> {formatList(diagnostics.localStream.trackStates)}</div>
          <div><span className="font-semibold text-slate-900">ICE servers:</span> {diagnostics.iceServers.map(formatIceServer).join(' | ') || 'none configured'}</div>
          {!hasTurn && (
            <div className="mt-1 font-semibold text-amber-700">
              TURN is not configured; same-computer or restrictive-network tests may stall at ICE checking.
            </div>
          )}
        </div>

        {peers.length > 0 ? (
          <div className="space-y-1">
            {peers.map((peer) => (
              <div key={peer.peerId} className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-slate-700">
                <div className="font-sans text-[11px] font-bold text-slate-950">{peer.peerId}{peer.hasRemoteStream ? ' · stream received' : ''}</div>
                <div>pc={peer.connectionState} ice={peer.iceConnectionState} gather={peer.iceGatheringState} sig={peer.signalingState}</div>
                <div>local ICE={formatList(peer.localCandidateTypes)} · remote ICE={formatList(peer.remoteCandidateTypes)} · queued={peer.pendingRemoteCandidateCount}</div>
                <div>receivers={formatList(peer.receiverTrackStates)}</div>
                <div>last signal={peer.lastSignalAt ? new Date(peer.lastSignalAt).toLocaleTimeString() : 'none'} · updated={new Date(peer.updatedAt).toLocaleTimeString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-2 py-2 text-slate-500">
            No RTCPeerConnection has been created yet. If the camera is on, this usually means signaling has not reached the other browser.
          </div>
        )}
      </div>
    </details>
  );
}

export default WebRTCDiagnosticsPanel;
