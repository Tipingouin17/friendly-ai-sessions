/**
 * SessionVideoGrid
 *
 * Light/neutral multi-video primitives for the session shells. The component is
 * intentionally data-driven: it can render real MediaStream-backed video when a
 * stream is provided, while gracefully falling back to participant avatars and
 * initials until live WebRTC streams are available in the room state.
 */

import React from 'react';
import BoringAvatar from 'boring-avatars';
import { Check, Mic, MicOff, MoreHorizontal, Pin, Sparkles, VideoOff } from 'lucide-react';

export type SessionVideoTileVariant = 'ai' | 'self' | 'remote' | 'spotlight';

export interface SessionVideoParticipant {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
  accentColor?: string;
  mediaStream?: MediaStream | null;
  isAI?: boolean;
  isYou?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  hasResponded?: boolean;
  reaction?: string | null;
  connectionStatus?: 'idle' | 'unsupported' | 'connecting' | 'connected' | 'disconnected' | 'failed';
  connectionStatusLabel?: string;
}

interface SessionVideoTileProps {
  participant: SessionVideoParticipant;
  variant?: SessionVideoTileVariant;
  showResponseStatus?: boolean;
  onPin?: (participantId: string) => void;
  className?: string;
}

interface SessionVideoGridProps {
  participants: SessionVideoParticipant[];
  variant?: 'participant-sidebar' | 'host-strip' | 'host-gallery';
  showResponseStatus?: boolean;
  onPin?: (participantId: string) => void;
  emptyLabel?: string;
  className?: string;
}

const variantClasses: Record<SessionVideoTileVariant, string> = {
  ai: 'border-amber-200 bg-amber-50',
  self: 'border-indigo-200 bg-indigo-50',
  remote: 'border-slate-200 bg-slate-50',
  spotlight: 'border-amber-200 bg-white min-h-[240px]',
};

const connectionStatusClasses: Record<NonNullable<SessionVideoParticipant['connectionStatus']>, string> = {
  idle: 'border-slate-200 bg-white/85 text-slate-500',
  unsupported: 'border-amber-200 bg-amber-50/90 text-amber-700',
  connecting: 'border-indigo-200 bg-indigo-50/90 text-indigo-700',
  connected: 'border-emerald-200 bg-emerald-50/90 text-emerald-700',
  disconnected: 'border-amber-200 bg-amber-50/90 text-amber-700',
  failed: 'border-rose-200 bg-rose-50/90 text-rose-700',
};

const GENERATED_AVATAR_COLORS = ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'];

const parseGeneratedAvatarSeed = (avatarUrl?: string | null): string | null => {
  if (!avatarUrl || !avatarUrl.includes('/api/avatar')) return null;

  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    const url = new URL(avatarUrl, baseUrl);
    return url.searchParams.get('name');
  } catch {
    const match = avatarUrl.match(/[?&]name=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }
};

const isPlaceholderAvatarUrl = (avatarUrl?: string | null): boolean => {
  if (!avatarUrl) return false;
  const normalizedUrl = avatarUrl.trim().toLowerCase();
  return normalizedUrl === '/placeholder.svg'
    || normalizedUrl.endsWith('/placeholder.svg')
    || normalizedUrl.includes('placeholder');
};

const getTileShadow = (participant: SessionVideoParticipant): string => {
  if (participant.isSpeaking && participant.isAI) {
    return 'shadow-[0_0_36px_rgba(245,158,11,0.22)]';
  }
  if (participant.isSpeaking) {
    return 'shadow-[0_0_28px_rgba(99,102,241,0.2)]';
  }
  return 'shadow-sm shadow-slate-200/70';
};

const StreamVideo: React.FC<{ stream: MediaStream; name: string; muted: boolean }> = ({ stream, name, muted }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    let cancelled = false;
    let retryTimer: number | null = null;
    const playStream = () => {
      if (cancelled) return;
      const playPromise = videoElement.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => {
          if (!cancelled) console.warn('Unable to autoplay live video stream:', error);
        });
      }
    };
    const schedulePlaybackRetry = () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      retryTimer = window.setTimeout(playStream, 120);
    };

    videoElement.muted = muted;
    videoElement.defaultMuted = muted;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.srcObject = stream;

    const handleTrackActivity = () => schedulePlaybackRetry();
    videoElement.addEventListener('loadedmetadata', playStream);
    videoElement.addEventListener('loadeddata', playStream);
    videoElement.addEventListener('canplay', playStream);
    stream.getVideoTracks().forEach((track) => track.addEventListener('unmute', schedulePlaybackRetry));
    stream.addEventListener('addtrack', handleTrackActivity);
    stream.addEventListener('removetrack', handleTrackActivity);

    if (videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
      playStream();
    } else {
      schedulePlaybackRetry();
    }

    return () => {
      cancelled = true;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      videoElement.removeEventListener('loadedmetadata', playStream);
      videoElement.removeEventListener('loadeddata', playStream);
      videoElement.removeEventListener('canplay', playStream);
      stream.getVideoTracks().forEach((track) => track.removeEventListener('unmute', schedulePlaybackRetry));
      stream.removeEventListener('addtrack', handleTrackActivity);
      stream.removeEventListener('removetrack', handleTrackActivity);
      videoElement.pause();
      videoElement.srcObject = null;
    };
  }, [muted, stream]);

  return (
    <video
      ref={videoRef}
      aria-label={`${name} live video`}
      className="h-full w-full object-cover"
      autoPlay
      playsInline
      muted={muted}
      disablePictureInPicture
    />
  );
};

export const SessionVideoTile: React.FC<SessionVideoTileProps> = ({
  participant,
  variant = participant.isAI ? 'ai' : participant.isYou ? 'self' : 'remote',
  showResponseStatus = false,
  onPin,
  className = '',
}) => {
  const isSpotlight = variant === 'spotlight';
  const accentColor = participant.accentColor || (participant.isAI ? 'rgb(217 119 6)' : 'rgb(79 70 229)');
  // A receiver can expose a live placeholder track before it has delivered
  // frames.  Treat video as live only after the browser unmutes it, so a blank
  // tile is never represented as an active camera feed.
  const hasLiveStream = Boolean(participant.mediaStream?.getVideoTracks().some((track) => track.readyState === 'live' && !track.muted));
  const [avatarImageError, setAvatarImageError] = React.useState(false);
  const generatedAvatarSeed = participant.avatarSeed || parseGeneratedAvatarSeed(participant.avatarUrl);
  const isGeneratedAvatarUrl = Boolean(participant.avatarUrl?.includes('/api/avatar'));
  const isPlaceholderAvatar = isPlaceholderAvatarUrl(participant.avatarUrl);
  const shouldRenderAvatarImage = Boolean(participant.avatarUrl && !isGeneratedAvatarUrl && !isPlaceholderAvatar && !avatarImageError);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handlePin = () => {
    onPin?.(participant.id);
    setIsMenuOpen(false);
  };

  React.useEffect(() => {
    setAvatarImageError(false);
  }, [participant.avatarUrl]);

  return (
    <article
      className={`group relative aspect-video overflow-hidden rounded-2xl border-2 transition ${variantClasses[variant]} ${getTileShadow(participant)} ${className}`}
      style={{ borderColor: participant.isSpeaking ? accentColor : undefined }}
      data-video-tile-variant={variant}
      data-participant-id={participant.id}
      data-connection-status={participant.connectionStatus}
      data-has-live-stream={hasLiveStream ? 'true' : 'false'}
    >
      {hasLiveStream && participant.mediaStream ? (
        <StreamVideo stream={participant.mediaStream} name={participant.name} muted={Boolean(participant.isYou || participant.isMuted)} />
      ) : shouldRenderAvatarImage ? (
        <img src={participant.avatarUrl!} alt={participant.name} className="h-full w-full object-cover" onError={() => setAvatarImageError(true)} />
      ) : generatedAvatarSeed && !participant.isAI ? (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100">
          <div className="rounded-full border border-white bg-white p-2 shadow-lg shadow-slate-300/50">
            <BoringAvatar
              size={isSpotlight ? 136 : 88}
              name={generatedAvatarSeed}
              variant="beam"
              colors={GENERATED_AVATAR_COLORS}
              square={false}
            />
          </div>
        </div>
      ) : (
        <div className={`flex h-full w-full items-center justify-center ${participant.isAI ? 'bg-gradient-to-br from-amber-50 via-white to-indigo-50 text-amber-700' : 'bg-gradient-to-br from-indigo-50 via-white to-slate-100 text-indigo-700'}`}>
          <span className={`font-display font-bold ${isSpotlight ? 'text-6xl' : 'text-xl'}`}>{participant.initials}</span>
        </div>
      )}

      {!hasLiveStream && (!participant.avatarUrl || isPlaceholderAvatar) && !generatedAvatarSeed && !participant.isAI && (
        <div className="absolute right-2 top-2 rounded-full border border-white/70 bg-white/85 p-1 text-slate-500 shadow-sm backdrop-blur" title="Camera preview unavailable">
          <VideoOff className="h-3.5 w-3.5" />
        </div>
      )}

      {participant.isAI && (
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800 backdrop-blur">
          <Sparkles className="h-3 w-3" />
          AI
        </div>
      )}

      {participant.isYou && !participant.isAI && (
        <div className="absolute left-2 top-2 rounded-full border border-indigo-200 bg-indigo-100/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-800 backdrop-blur">
          You
        </div>
      )}

      {showResponseStatus && !participant.isAI && (
        <div className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border backdrop-blur ${participant.hasResponded ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-white/85 text-slate-400'}`} title={participant.hasResponded ? 'Responded' : 'Waiting for response'}>
          {participant.hasResponded ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </div>
      )}

      {participant.reaction && (
        <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full border border-white/70 bg-white/90 px-2 py-1 text-sm font-bold shadow-lg shadow-slate-200/80 animate-reaction-pop">
          {participant.reaction}
        </div>
      )}

      {participant.connectionStatus && !participant.isAI && !participant.isYou && (
        <div className={`absolute bottom-9 left-2 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm backdrop-blur ${connectionStatusClasses[participant.connectionStatus]}`}>
          {participant.connectionStatusLabel || participant.connectionStatus}
        </div>
      )}

      {participant.isAI && participant.isSpeaking && (
        <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-end gap-1 rounded-full border border-amber-200 bg-white/85 px-3 py-1.5 backdrop-blur">
          {[0, 1, 2, 3, 4].map((bar) => (
            <span
              key={bar}
              className="block w-1 origin-bottom rounded-full bg-amber-400 animate-sound-bar"
              style={{ height: `${8 + (bar % 3) * 5}px`, animationDelay: `${bar * 90}ms` }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-slate-950/70 to-transparent px-2.5 pb-2 pt-8 text-white">
        <span className="min-w-0 truncate text-xs font-semibold drop-shadow">{participant.name}</span>
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${participant.isMuted ? 'bg-rose-500/90' : participant.isSpeaking ? 'bg-emerald-500/90' : 'bg-white/20'}`}>
          {participant.isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
        </span>
      </div>

      {onPin && !participant.isAI && (
        <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex group-focus-within:flex">
          <button
            type="button"
            onClick={handlePin}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/55 text-white backdrop-blur transition hover:bg-slate-950/75 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label={`Pin ${participant.name}`}
            title={`Pin ${participant.name}`}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-950/55 text-white backdrop-blur transition hover:bg-slate-950/75 focus:outline-none focus:ring-2 focus:ring-white/70"
            aria-label={`More options for ${participant.name}`}
            aria-expanded={isMenuOpen}
            title={`More options for ${participant.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {onPin && !participant.isAI && isMenuOpen && (
        <div className="absolute right-2 top-10 z-20 w-56 rounded-xl border border-white/60 bg-white/95 p-2 text-xs text-slate-700 shadow-xl shadow-slate-900/20 backdrop-blur">
          <p className="mb-1 truncate font-semibold text-slate-900">{participant.name}</p>
          <button
            type="button"
            onClick={handlePin}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left font-medium text-indigo-700 hover:bg-indigo-50"
          >
            <Pin className="h-3.5 w-3.5" />
            Pin to spotlight
          </button>
          <div className="mt-1 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] leading-4 text-slate-500">
            <p>Audio: {participant.isMuted ? 'muted' : participant.isSpeaking ? 'speaking' : 'available'}</p>
            {participant.connectionStatus && <p>Connection: {participant.connectionStatusLabel || participant.connectionStatus}</p>}
            {showResponseStatus && <p>Response: {participant.hasResponded ? 'submitted' : 'waiting'}</p>}
          </div>
        </div>
      )}
    </article>
  );
};

export const SessionVideoGrid: React.FC<SessionVideoGridProps> = ({
  participants,
  variant = 'participant-sidebar',
  showResponseStatus = false,
  onPin,
  emptyLabel = 'Participant video tiles will appear as people join.',
  className = '',
}) => {
  if (participants.length === 0) {
    return (
      <div className={`flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 ${className}`}>
        {emptyLabel}
      </div>
    );
  }

  const gridClass = variant === 'host-gallery'
    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'
    : variant === 'host-strip'
    ? 'grid auto-cols-[minmax(150px,180px)] grid-flow-col gap-3 overflow-x-auto pb-2'
    : 'grid grid-cols-2 gap-2 overflow-y-auto pr-1 data-[session-video-grid=participant-sidebar]:auto-rows-min';

  return (
    <div className={`${gridClass} ${className}`} data-session-video-grid={variant}>
      {participants.map((participant) => (
        <SessionVideoTile
          key={participant.id}
          participant={participant}
          variant={participant.isAI ? 'ai' : participant.isYou ? 'self' : 'remote'}
          showResponseStatus={showResponseStatus}
          onPin={onPin}
        />
      ))}
    </div>
  );
};
