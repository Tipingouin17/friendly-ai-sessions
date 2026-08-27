/**
 * ChatInput — responsive participant composer
 *
 * Browser-native speech recognition remains the fastest path where it is
 * reliable.  Short recorded-response transcription is an explicit,
 * review-before-send fallback for browsers such as iPhone Safari where the
 * Web Speech recognition service is only partially available.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Send, StopCircle, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { SpeechRecognition } from "@/types/chat";
import { MAX_MESSAGE_LENGTH } from "@/utils/inputValidation";
import { transcribeRecordedResponse } from "@/lib/api";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  isMobile?: boolean; // kept for API compatibility
  speechEnabled?: boolean;
  speechLanguage?: string;
  conversationId?: number | null;
  onSpeechInterim?: (payload: { transcript: string; confidence: number | null }) => void;
  /** Parents must persist this explicit value rather than read React state after native recognition ends. */
  onSpeechFinal?: (payload: { transcript: string; message: string; confidence: number | null; startedAt: string | null; endedAt: string; durationMs: number | null }) => void;
}

type RecordedResponseState = 'idle' | 'recording' | 'ready' | 'transcribing';

const MIN_RECORDED_RESPONSE_MS = 1_000;
const MAX_RECORDED_RESPONSE_MS = 60_000;
// 4 MiB becomes roughly 5.34 MiB once base64-encoded, leaving headroom beneath
// the server's 5 MiB decoded-audio and 7 MiB request caps.
const MAX_RECORDED_RESPONSE_BYTES = 4 * 1024 * 1024;

function isIosWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function preferredRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('recording_read_failed'));
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIndex = result.indexOf(',');
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : '');
    };
    reader.readAsDataURL(blob);
  });
}

const ChatInput = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording = false,
  setIsRecording = () => { /* no-op */ },
  placeholder = "Type your response…",
  disabled = false,
  speechEnabled = true,
  speechLanguage = 'en-US',
  conversationId = null,
  onSpeechInterim,
  onSpeechFinal,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingBlobRef = useRef<Blob | null>(null);
  const recordingMimeTypeRef = useRef<string>('audio/mp4');
  const recordedDurationMsRef = useRef<number>(0);
  const recordingStartedAtRef = useRef<string | null>(null);
  const recordingStartedMsRef = useRef<number | null>(null);
  const recordingStopTimerRef = useRef<number | null>(null);
  const preRecordingTextRef = useRef<string>('');
  const finalTranscriptRef = useRef<string>('');
  const latestConfidenceRef = useRef<number | null>(null);
  const suppressRecognitionResultRef = useRef(false);
  const isMountedRef = useRef(true);
  const latestSpeechCallbacksRef = useRef({ setInputMessage, setIsRecording, onSpeechInterim, onSpeechFinal });
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [recordingSupported, setRecordingSupported] = useState<boolean | null>(null);
  const [useRecordedFallback, setUseRecordedFallback] = useState(false);
  const [recordedResponseState, setRecordedResponseState] = useState<RecordedResponseState>('idle');
  const [nativeSpeechFailure, setNativeSpeechFailure] = useState<string | null>(null);

  const charCount = inputMessage.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.80;
  const isFallbackRecording = recordedResponseState === 'recording';
  const isAnyRecording = isRecording || isFallbackRecording;
  const canRecordResponse = recordingSupported === true && conversationId !== null && conversationId > 0;
  const shouldUseRecordedFallback = useRecordedFallback || speechSupported === false;

  const releaseRecordingStream = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingStopTimerRef.current !== null) {
      window.clearTimeout(recordingStopTimerRef.current);
      recordingStopTimerRef.current = null;
    }
  }, []);

  // The recognition object must remain alive while a parent records its own
  // speech analytics. Refs provide the latest callbacks without treating a
  // normal parent render as a reason to stop an active microphone turn.
  useEffect(() => {
    latestSpeechCallbacksRef.current = { setInputMessage, setIsRecording, onSpeechInterim, onSpeechFinal };
  }, [onSpeechFinal, onSpeechInterim, setInputMessage, setIsRecording]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight;
    const maxHeight = lineHeight * 4;
    el.style.height = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight) + 'px';
  }, [inputMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recorderAvailable = Boolean(
      navigator.mediaDevices?.getUserMedia
      && typeof MediaRecorder !== 'undefined'
      && preferredRecordingMimeType(),
    );
    setRecordingSupported(recorderAvailable);
    // Safari advertises webkitSpeechRecognition but does not provide a
    // dependable recognition service. Start it on the explicit recording path.
    setUseRecordedFallback(isIosWebKit() && recorderAvailable);

    if (!SpeechRecognitionAPI) {
      setSpeechSupported(false);
      return;
    }

    setSpeechSupported(true);
    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = speechLanguage;

    recognitionRef.current.onresult = (event) => {
      if (suppressRecognitionResultRef.current) return;
      const resultList = Array.from(event.results);
      const transcript = resultList.map((result) => result[0].transcript).join('');
      const finalTranscript = resultList
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join('')
        .trim();
      const confidenceValues = resultList
        .map((result) => result[0].confidence)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
      const confidence = confidenceValues.length > 0
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : null;
      latestConfidenceRef.current = confidence;
      if (finalTranscript) finalTranscriptRef.current = finalTranscript;

      const combined = preRecordingTextRef.current
        ? `${preRecordingTextRef.current.trimEnd()} ${transcript}`
        : transcript;
      latestSpeechCallbacksRef.current.setInputMessage(combined.slice(0, MAX_MESSAGE_LENGTH));
      latestSpeechCallbacksRef.current.onSpeechInterim?.({ transcript, confidence });
    };

    recognitionRef.current.onerror = (event) => {
      latestSpeechCallbacksRef.current.setIsRecording(false);
      const error = event.error || 'unknown';
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setNativeSpeechFailure('Microphone access was not granted for voice typing. You can type your response instead.');
        toast.error('Microphone access was not granted. You can type your response instead.');
        return;
      }
      if (error === 'no-speech') {
        toast.info('No speech was detected. Try again or type your response.');
        return;
      }
      // A recognition-service or network failure is common on Safari. Offer a
      // separately consented short-recording path instead of claiming retrying
      // native dictation will work.
      setUseRecordedFallback(true);
      setNativeSpeechFailure('Voice typing is not available here. You can record a short response for transcription or type it instead.');
      toast.info('Voice typing is unavailable here. Record a short response or type instead.');
    };

    recognitionRef.current.onend = () => {
      latestSpeechCallbacksRef.current.setIsRecording(false);
      const shouldSuppressFinal = suppressRecognitionResultRef.current;
      const finalTranscript = shouldSuppressFinal ? '' : finalTranscriptRef.current.trim();
      if (finalTranscript) {
        const endedAt = new Date().toISOString();
        const durationMs = recordingStartedMsRef.current !== null
          ? Math.round(performance.now() - recordingStartedMsRef.current)
          : null;
        const finalizedMessage = (preRecordingTextRef.current
          ? `${preRecordingTextRef.current.trimEnd()} ${finalTranscript}`
          : finalTranscript
        ).trim().slice(0, MAX_MESSAGE_LENGTH);
        latestSpeechCallbacksRef.current.onSpeechFinal?.({
          transcript: finalTranscript,
          message: finalizedMessage,
          confidence: latestConfidenceRef.current,
          startedAt: recordingStartedAtRef.current,
          endedAt,
          durationMs,
        });
      }
      finalTranscriptRef.current = '';
      latestConfidenceRef.current = null;
      recordingStartedAtRef.current = null;
      recordingStartedMsRef.current = null;
      suppressRecognitionResultRef.current = false;
    };

    return () => {
      // A teardown must not turn a late browser `onend` event into a durable
      // native-speech send after the composer has unmounted.
      suppressRecognitionResultRef.current = true;
      finalTranscriptRef.current = '';
      try {
        recognitionRef.current?.stop();
      } catch {
        // Browser recognition implementations can throw if already stopped.
      }
      clearRecordingTimer();
      try {
        if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder stop races during unmount.
      }
      releaseRecordingStream();
    };
  }, [clearRecordingTimer, releaseRecordingStream, speechLanguage]);

  useEffect(() => {
    if (!speechEnabled && isRecording) {
      suppressRecognitionResultRef.current = true;
      preRecordingTextRef.current = '';
      finalTranscriptRef.current = '';
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop races when settings change while recognition is ending.
      }
      setIsRecording(false);
    }
  }, [isRecording, setIsRecording, speechEnabled]);

  const stopRecordedResponse = () => {
    clearRecordingTimer();
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch {
      releaseRecordingStream();
      setRecordedResponseState('idle');
      setIsRecording(false);
      toast.error('The recording could not be stopped. Please type your response instead.');
    }
  };

  const discardRecordedResponse = () => {
    clearRecordingTimer();
    try {
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    } catch {
      // The recording may already have ended.
    }
    releaseRecordingStream();
    recordingChunksRef.current = [];
    recordingBlobRef.current = null;
    recordedDurationMsRef.current = 0;
    setRecordedResponseState('idle');
    setIsRecording(false);
  };

  const handleStartRecordedResponse = async () => {
    if (!speechEnabled) {
      toast.info('Voice input is disabled for this session by the host settings.');
      return;
    }
    if (!canRecordResponse) {
      toast.error('Recording is not available in this browser. Please type your response instead.');
      return;
    }
    if (isAnyRecording || recordedResponseState === 'transcribing') return;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredRecordingMimeType() || 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingMimeTypeRef.current = recorder.mimeType || mimeType;
      recordingChunksRef.current = [];
      recordingBlobRef.current = null;
      preRecordingTextRef.current = inputMessage;
      recordingStartedAtRef.current = new Date().toISOString();
      recordingStartedMsRef.current = performance.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        clearRecordingTimer();
        if (!isMountedRef.current) {
          releaseRecordingStream();
          return;
        }
        const durationMs = recordingStartedMsRef.current !== null
          ? Math.round(performance.now() - recordingStartedMsRef.current)
          : 0;
        recordedDurationMsRef.current = durationMs;
        const blob = new Blob(recordingChunksRef.current, { type: recordingMimeTypeRef.current });
        releaseRecordingStream();
        setIsRecording(false);
        if (blob.size === 0 || durationMs < MIN_RECORDED_RESPONSE_MS) {
          discardRecordedResponse();
          toast.info('Record for at least one second, then try again or type your response.');
          return;
        }
        if (blob.size > MAX_RECORDED_RESPONSE_BYTES) {
          discardRecordedResponse();
          toast.error('This recording is too large to transcribe. Keep your response under one minute or type it instead.');
          return;
        }
        recordingBlobRef.current = blob;
        setRecordedResponseState('ready');
      };
      recorder.onerror = () => {
        releaseRecordingStream();
        if (!isMountedRef.current) return;
        setIsRecording(false);
        setRecordedResponseState('idle');
        toast.error('Recording could not start. Check microphone access or type your response.');
      };
      recorder.start(250);
      setRecordedResponseState('recording');
      setIsRecording(true);
      recordingStopTimerRef.current = window.setTimeout(() => {
        toast.info('Recording stopped after one minute. Review it before transcribing.');
        stopRecordedResponse();
      }, MAX_RECORDED_RESPONSE_MS);
    } catch {
      // getUserMedia can succeed before a browser rejects MediaRecorder.start().
      // Stop every acquired track in that path as well as ordinary completion.
      stream?.getTracks().forEach((track) => track.stop());
      releaseRecordingStream();
      if (!isMountedRef.current) return;
      setUseRecordedFallback(true);
      setNativeSpeechFailure('Microphone recording is unavailable. You can type your response instead.');
      toast.error('Microphone access was not granted. You can type your response instead.');
    }
  };

  const handleTranscribeRecordedResponse = async () => {
    const blob = recordingBlobRef.current;
    if (!blob || !conversationId || recordedResponseState !== 'ready') return;
    setRecordedResponseState('transcribing');
    try {
      const audioBase64 = await blobToBase64(blob);
      if (!audioBase64) throw new Error('recording_read_failed');
      const { text, error } = await transcribeRecordedResponse({
        conversationId,
        audioBase64,
        mimeType: recordingMimeTypeRef.current,
        durationMs: recordedDurationMsRef.current,
        language: speechLanguage,
      });
      if (error || !text) {
        const message = error?.message || 'Voice transcription was unavailable. You can still type your response.';
        toast.error(message);
        setRecordedResponseState('ready');
        return;
      }
      const combined = preRecordingTextRef.current.trim()
        ? `${preRecordingTextRef.current.trimEnd()} ${text}`
        : text;
      setInputMessage(combined.trim().slice(0, MAX_MESSAGE_LENGTH));
      discardRecordedResponse();
      textareaRef.current?.focus();
      toast.success('Transcription is ready to review. Send only when the draft is correct.');
    } catch {
      toast.error('The recording could not be read. You can retry transcription or type your response.');
      setRecordedResponseState('ready');
    }
  };

  const handleStartNativeRecording = () => {
    if (!speechEnabled) {
      toast.info('Voice input is disabled for this session by the host settings.');
      return;
    }
    if (speechSupported === null) {
      toast.info('Preparing voice input — please try again in a moment.');
      return;
    }
    if (!speechSupported) {
      setUseRecordedFallback(true);
      handleStartRecordedResponse();
      return;
    }
    if (!recognitionRef.current || isAnyRecording) return;
    preRecordingTextRef.current = inputMessage;
    suppressRecognitionResultRef.current = false;
    try {
      recognitionRef.current.lang = speechLanguage;
      recordingStartedAtRef.current = new Date().toISOString();
      recordingStartedMsRef.current = performance.now();
      finalTranscriptRef.current = '';
      latestConfidenceRef.current = null;
      recognitionRef.current.start();
      setIsRecording(true);
      toast.info('Listening — speak your response, then tap Stop to review before sending.');
    } catch {
      setUseRecordedFallback(true);
      setNativeSpeechFailure('Voice typing is not available here. You can record a short response for transcription or type it instead.');
      toast.info('Voice typing is unavailable here. Record a short response or type instead.');
    }
  };

  const handleStopNativeRecording = (options: { suppressFinalTranscript?: boolean } = {}) => {
    if (options.suppressFinalTranscript) {
      suppressRecognitionResultRef.current = true;
      preRecordingTextRef.current = '';
      finalTranscriptRef.current = '';
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop races when the browser already ended recognition.
    }
    setIsRecording(false);
  };

  const handleVoiceButton = () => {
    if (isFallbackRecording) {
      stopRecordedResponse();
      return;
    }
    if (isRecording) {
      handleStopNativeRecording();
      return;
    }
    if (shouldUseRecordedFallback) {
      void handleStartRecordedResponse();
      return;
    }
    handleStartNativeRecording();
  };

  const handleSend = () => {
    if (!inputMessage.trim() || disabled || isAnyRecording) return;
    if (isOverLimit) return;
    onSendMessage();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !disabled) {
      event.preventDefault();
      handleSend();
    }
  };

  const voiceButtonDisabled = disabled || !speechEnabled
    || recordedResponseState === 'transcribing'
    || recordedResponseState === 'ready'
    || (shouldUseRecordedFallback && !canRecordResponse);
  const voiceButtonLabel = isFallbackRecording
    ? 'Stop recording response'
    : isRecording
      ? 'Stop voice input'
      : shouldUseRecordedFallback
        ? 'Record response for transcription'
        : 'Start voice input';
  const voiceButtonTitle = isFallbackRecording
    ? 'Stop recording and review'
    : shouldUseRecordedFallback
      ? 'Record a short response to transcribe'
      : 'Start voice input';

  return (
    <div className="border-t border-slate-200 bg-white px-2 py-2 sm:px-4 sm:py-3">
      <div className="flex items-end gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          {isAnyRecording ? (
            <div className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5" role="status" aria-live="polite">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 motion-reduce:animate-none" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-rose-900">Listening — speak your response</span>
                <span className="block text-xs leading-relaxed text-rose-700">Tap Stop to review your draft before sending.</span>
              </span>
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={inputMessage}
              onChange={(event) => setInputMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              aria-label={placeholder || 'Chat message input'}
              disabled={disabled || recordedResponseState === 'transcribing'}
              rows={1}
              className={`w-full resize-none rounded-2xl border bg-slate-50 px-3 py-2 text-sm leading-[20px] text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-transparent focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-3 sm:leading-[22px] ${
                isOverLimit
                  ? 'border-red-400 focus:ring-red-400'
                  : isNearLimit
                    ? 'border-amber-400 focus:ring-amber-400'
                    : 'border-slate-200 focus:ring-indigo-400'
              }`}
              style={{ minHeight: '38px', maxHeight: '88px', overflowY: 'auto' }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={handleVoiceButton}
          disabled={voiceButtonDisabled}
          aria-pressed={isAnyRecording}
          aria-label={voiceButtonLabel}
          title={voiceButtonTitle}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all sm:h-11 sm:w-11 ${
            isAnyRecording
              ? 'animate-pulse bg-red-100 text-red-600'
              : voiceButtonDisabled
                ? 'cursor-not-allowed bg-slate-100 text-slate-300'
                : shouldUseRecordedFallback
                  ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                  : 'bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'
          } disabled:opacity-40`}
        >
          {isAnyRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!inputMessage.trim() || disabled || isOverLimit || isAnyRecording || recordedResponseState === 'transcribing'}
          aria-label={isAnyRecording ? 'Stop voice input before sending' : 'Send message'}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {shouldUseRecordedFallback && !isFallbackRecording && recordedResponseState === 'idle' && (
        <p className="mt-1 px-1 text-xs leading-relaxed text-slate-600" role="status">
          {nativeSpeechFailure || 'Voice typing is not available in this browser. You can record a short response for transcription or type it instead.'}
        </p>
      )}

      {recordedResponseState === 'ready' && (
        <div className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3" role="status" aria-live="polite">
          <p className="text-sm font-semibold text-indigo-950">Recording ready for transcription</p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-800">
            If you continue, this short recording is sent securely for transcription and discarded after processing. You can review and edit the text before sending it.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleTranscribeRecordedResponse()}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 active:scale-[0.98]"
            >
              <Upload className="h-4 w-4" />
              Transcribe recording
            </button>
            <button
              type="button"
              onClick={discardRecordedResponse}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-800 transition-colors hover:bg-indigo-100 active:scale-[0.98]"
            >
              <X className="h-4 w-4" />
              Discard and type
            </button>
          </div>
        </div>
      )}

      {recordedResponseState === 'transcribing' && (
        <p className="mt-2 px-1 text-xs font-medium text-indigo-700" role="status" aria-live="polite">
          Transcribing your recording… You will be able to review the text before sending.
        </p>
      )}

      {speechEnabled && !shouldUseRecordedFallback && speechSupported === false && (
        <p className="mt-1 px-1 text-xs leading-relaxed text-slate-500" role="status">
          Voice typing is not available in this browser. You can still send your response by typing it below.
        </p>
      )}

      {!isAnyRecording && charCount > 0 && (
        <div className={`mt-1 pr-1 text-right text-xs ${
          isOverLimit
            ? 'font-semibold text-red-500'
            : isNearLimit
              ? 'text-amber-500'
              : 'text-slate-400'
        }`}>
          {charCount}/{MAX_MESSAGE_LENGTH}
          {isOverLimit && <span className="ml-1">— message too long</span>}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
