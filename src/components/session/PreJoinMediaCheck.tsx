import React from 'react';
import { Camera, CameraOff, Mic, MicOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  persistParticipantMediaPreferences,
  readParticipantMediaPreferences,
  type ParticipantMediaPreferences,
} from '@/utils/participantMediaPreferences';

interface PreJoinMediaCheckProps {
  conversationId: number | null;
  disabled?: boolean;
}

type MediaStatus = 'idle' | 'starting' | 'on' | 'off' | 'blocked' | 'unsupported';

const createEmptyAnalyser = () => ({
  context: null as AudioContext | null,
  analyser: null as AnalyserNode | null,
  source: null as MediaStreamAudioSourceNode | null,
  data: null as Uint8Array | null,
});

const PreJoinMediaCheck: React.FC<PreJoinMediaCheckProps> = ({ conversationId, disabled = false }) => {
  const initialPreferences = React.useMemo<ParticipantMediaPreferences>(
    () => readParticipantMediaPreferences(conversationId),
    [conversationId]
  );
  const [cameraEnabled, setCameraEnabled] = React.useState(initialPreferences.cameraEnabled);
  const [microphoneEnabled, setMicrophoneEnabled] = React.useState(initialPreferences.microphoneEnabled);
  const [cameraStatus, setCameraStatus] = React.useState<MediaStatus>(initialPreferences.cameraEnabled ? 'starting' : 'off');
  const [microphoneStatus, setMicrophoneStatus] = React.useState<MediaStatus>(initialPreferences.microphoneEnabled ? 'starting' : 'off');
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [micLevel, setMicLevel] = React.useState(0);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = React.useRef<MediaStream | null>(null);
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const analyserRef = React.useRef(createEmptyAnalyser());
  const levelFrameRef = React.useRef<number | null>(null);

  const persistPreferences = React.useCallback((nextCameraEnabled: boolean, nextMicrophoneEnabled: boolean) => {
    persistParticipantMediaPreferences(conversationId, {
      cameraEnabled: nextCameraEnabled,
      microphoneEnabled: nextMicrophoneEnabled,
    });
  }, [conversationId]);

  const stopVideoStream = React.useCallback(() => {
    videoStreamRef.current?.getTracks().forEach((track) => track.stop());
    videoStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stopAudioMeter = React.useCallback(() => {
    if (levelFrameRef.current !== null) {
      cancelAnimationFrame(levelFrameRef.current);
      levelFrameRef.current = null;
    }
    analyserRef.current.source?.disconnect();
    void analyserRef.current.context?.close();
    analyserRef.current = createEmptyAnalyser();
    setMicLevel(0);
  }, []);

  const stopAudioStream = React.useCallback(() => {
    stopAudioMeter();
    audioStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioStreamRef.current = null;
  }, [stopAudioMeter]);

  const attachVideoPreview = React.useCallback(async (stream: MediaStream) => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = true;
    videoElement.defaultMuted = true;
    videoElement.autoplay = true;
    videoElement.playsInline = true;
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');
    videoElement.srcObject = stream;
    videoElement.load();

    const tryPlay = () => videoElement.play().catch(() => undefined);
    await tryPlay();
    window.setTimeout(tryPlay, 120);
  }, []);

  const startCamera = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unsupported');
      setMediaError('Camera preview is not supported in this browser.');
      setCameraEnabled(false);
      persistPreferences(false, microphoneEnabled);
      return;
    }

    setCameraStatus('starting');
    setMediaError(null);
    try {
      stopVideoStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 360 } },
        audio: false,
      });
      videoStreamRef.current = stream;
      setCameraEnabled(true);
      await attachVideoPreview(stream);
      setCameraStatus('on');
      persistPreferences(true, microphoneEnabled);
    } catch (error) {
      console.error('Unable to start pre-join camera preview:', error);
      stopVideoStream();
      setCameraEnabled(false);
      setCameraStatus('blocked');
      setMediaError('Camera access was blocked. Allow camera permission to join with video on.');
      persistPreferences(false, microphoneEnabled);
    }
  }, [attachVideoPreview, microphoneEnabled, persistPreferences, stopVideoStream]);

  const startMicrophone = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneStatus('unsupported');
      setMediaError('Microphone testing is not supported in this browser.');
      setMicrophoneEnabled(false);
      persistPreferences(cameraEnabled, false);
      return;
    }

    setMicrophoneStatus('starting');
    setMediaError(null);
    try {
      stopAudioStream();
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      audioStreamRef.current = stream;

      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextConstructor) {
        const context = new AudioContextConstructor();
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        const source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyserRef.current = { context, analyser, source, data };

        const updateLevel = () => {
          const currentAnalyser = analyserRef.current.analyser;
          const currentData = analyserRef.current.data;
          if (!currentAnalyser || !currentData) return;
          currentAnalyser.getByteTimeDomainData(currentData);
          const peak = currentData.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0);
          setMicLevel(Math.min(100, Math.round((peak / 128) * 140)));
          levelFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      }

      setMicrophoneEnabled(true);
      setMicrophoneStatus('on');
      persistPreferences(cameraEnabled, true);
    } catch (error) {
      console.error('Unable to start pre-join microphone test:', error);
      stopAudioStream();
      setMicrophoneEnabled(false);
      setMicrophoneStatus('blocked');
      setMediaError('Microphone access was blocked. Allow microphone permission to join with audio on.');
      persistPreferences(cameraEnabled, false);
    }
  }, [cameraEnabled, persistPreferences, stopAudioStream]);

  const turnCameraOff = React.useCallback(() => {
    stopVideoStream();
    setCameraEnabled(false);
    setCameraStatus('off');
    persistPreferences(false, microphoneEnabled);
  }, [microphoneEnabled, persistPreferences, stopVideoStream]);

  const turnMicrophoneOff = React.useCallback(() => {
    stopAudioStream();
    setMicrophoneEnabled(false);
    setMicrophoneStatus('off');
    persistPreferences(cameraEnabled, false);
  }, [cameraEnabled, persistPreferences, stopAudioStream]);

  React.useEffect(() => {
    if (initialPreferences.cameraEnabled) void startCamera();
    if (initialPreferences.microphoneEnabled) void startMicrophone();
    return () => {
      stopVideoStream();
      stopAudioStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run once for this join page instance; later changes are handled by explicit toggle actions.
  }, []);

  React.useEffect(() => {
    const currentStream = videoStreamRef.current;
    if (cameraEnabled && currentStream && videoRef.current?.srcObject !== currentStream) {
      void attachVideoPreview(currentStream);
    }
  }, [attachVideoPreview, cameraEnabled]);

  const cameraLabel = cameraStatus === 'starting' ? 'Starting…' : cameraEnabled ? 'Camera on' : 'Camera off';
  const microphoneLabel = microphoneStatus === 'starting' ? 'Testing…' : microphoneEnabled ? 'Mic on' : 'Mic off';

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5">
      <div className="mb-2 flex items-start justify-between gap-3 sm:mb-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Check your camera and microphone</p>
          <p className="mt-0.5 text-xs text-slate-500 sm:block">Your choices are remembered for this session before you join.</p>
        </div>
        {(cameraEnabled || microphoneEnabled) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Ready
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        {cameraEnabled ? (
          <video ref={videoRef} muted playsInline autoPlay disablePictureInPicture className="aspect-video w-full object-cover" />
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 text-slate-300">
            <CameraOff className="h-8 w-8" />
            <span className="text-xs font-medium">Camera preview is off</span>
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled || cameraStatus === 'starting'}
          onClick={cameraEnabled ? turnCameraOff : startCamera}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${cameraEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
        >
          {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
          {cameraLabel}
        </button>
        <button
          type="button"
          disabled={disabled || microphoneStatus === 'starting'}
          onClick={microphoneEnabled ? turnMicrophoneOff : startMicrophone}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60 ${microphoneEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
        >
          {microphoneEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          {microphoneLabel}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500">
        <Mic className={`h-3.5 w-3.5 ${microphoneEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500 transition-all duration-100" style={{ width: `${microphoneEnabled ? Math.max(8, micLevel) : 0}%` }} />
        </div>
        <span className="w-16 text-right">{microphoneEnabled ? 'Speak now' : 'Mic off'}</span>
      </div>

      {mediaError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{mediaError}</span>
        </div>
      )}
    </div>
  );
};

export default PreJoinMediaCheck;
