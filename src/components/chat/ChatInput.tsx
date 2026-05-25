/**
 * ChatInput — World-class responsive redesign
 *
 * - No isMobile branching — pure CSS responsive
 * - Auto-growing textarea (min 2 lines, max 6 lines)
 * - Prominent send button
 * - Clean voice recording state
 * - Live character counter with 500-char limit (context window safety)
 */

import React, { useRef, useEffect, useState } from 'react';
import { Mic, Send, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { SpeechRecognition } from "@/types/chat";
import { MAX_MESSAGE_LENGTH } from "@/utils/inputValidation";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  isMobile?: boolean; // kept for API compat
  speechEnabled?: boolean;
  speechLanguage?: string;
  onSpeechInterim?: (payload: { transcript: string; confidence: number | null }) => void;
  onSpeechFinal?: (payload: { transcript: string; confidence: number | null; startedAt: string | null; endedAt: string; durationMs: number | null }) => void;
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
  onSpeechInterim,
  onSpeechFinal,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const preRecordingTextRef = useRef<string>('');
  const recordingStartedAtRef = useRef<string | null>(null);
  const recordingStartedMsRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const latestConfidenceRef = useRef<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);

  const charCount = inputMessage.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const isNearLimit = charCount > MAX_MESSAGE_LENGTH * 0.80; // warn at 80% (1600 chars)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 22;
    const minHeight = lineHeight * 1;
    const maxHeight = lineHeight * 4;
    el.style.height = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight) + 'px';
  }, [inputMessage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) { setSpeechSupported(false); return; }

    setSpeechSupported(true);
    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = speechLanguage;

    recognitionRef.current.onresult = (event) => {
      const resultList = Array.from(event.results);
      const transcript = resultList.map(r => r[0].transcript).join('');
      const finalTranscript = resultList
        .filter(r => r.isFinal)
        .map(r => r[0].transcript)
        .join('')
        .trim();
      const confidenceValues = resultList
        .map(r => r[0].confidence)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
      const confidence = confidenceValues.length > 0
        ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
        : null;
      latestConfidenceRef.current = confidence;
      if (finalTranscript) finalTranscriptRef.current = finalTranscript;

      const combined = preRecordingTextRef.current
        ? preRecordingTextRef.current.trimEnd() + ' ' + transcript
        : transcript;
      // Truncate voice input to the UI limit
      setInputMessage(combined.slice(0, MAX_MESSAGE_LENGTH));
      onSpeechInterim?.({ transcript, confidence });
    };

    recognitionRef.current.onerror = (event) => {
      setIsRecording(false);
      if (event.error === 'not-allowed') {
        toast.error("Microphone access denied — please allow it in your browser settings.");
      } else if (event.error !== 'no-speech') {
        toast.error("Voice input error — please try again.");
      }
    };

    recognitionRef.current.onend = () => {
      setIsRecording(false);
      const finalTranscript = finalTranscriptRef.current.trim();
      if (finalTranscript) {
        const endedAt = new Date().toISOString();
        const durationMs = recordingStartedMsRef.current !== null
          ? Math.round(performance.now() - recordingStartedMsRef.current)
          : null;
        onSpeechFinal?.({
          transcript: finalTranscript,
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
    };

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Browser recognition implementations can throw if already stopped.
      }
    };
  }, [onSpeechFinal, onSpeechInterim, setInputMessage, setIsRecording, speechLanguage]);

  useEffect(() => {
    if (!speechEnabled && isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore stop races when settings change while recognition is ending.
      }
      setIsRecording(false);
    }
  }, [isRecording, setIsRecording, speechEnabled]);

  const handleStartRecording = () => {
    if (!speechEnabled) {
      toast.info("Voice input is disabled for this session by the host settings.");
      return;
    }
    if (speechSupported === null) {
      toast.info("Preparing voice input — please try again in a moment.");
      return;
    }
    if (!speechSupported) {
      toast.error("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (recognitionRef.current) {
      preRecordingTextRef.current = inputMessage;
      try {
        recognitionRef.current.lang = speechLanguage;
        recordingStartedAtRef.current = new Date().toISOString();
        recordingStartedMsRef.current = performance.now();
        finalTranscriptRef.current = '';
        latestConfidenceRef.current = null;
        recognitionRef.current.start();
        setIsRecording(true);
        toast.info("Listening… speak now, then press Stop or Enter to send.");
      } catch {
        toast.error("Could not start voice input — check your microphone permissions.");
      }
    }
  };

  const handleStopRecording = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop races when the browser already ended recognition.
    }
    setIsRecording(false);
  };

  const handleSend = () => {
    if (!inputMessage.trim() || disabled) return;
    if (isOverLimit) return; // hard block at 2000 chars
    if (isRecording) handleStopRecording();
    onSendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  return (
    <div className="border-t border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-3">
      <div className="flex items-end gap-2">
        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? "Waiting for the next question…" : placeholder}
            disabled={disabled}
            rows={1}
            className={`w-full resize-none rounded-2xl border bg-slate-50 px-3.5 py-2.5 text-sm leading-[22px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-shadow sm:px-4 sm:py-3 ${
              isOverLimit
                ? "border-red-400 focus:ring-red-400"
                : isNearLimit
                  ? "border-amber-400 focus:ring-amber-400"
                  : "border-slate-200 focus:ring-indigo-400"
            }`}
            style={{ minHeight: '42px', maxHeight: '104px', overflowY: 'auto' }}
          />
          {isRecording && (
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs text-red-500 font-medium pointer-events-none">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Listening…
            </div>
          )}
        </div>

        {/* Voice button */}
        <button
          type="button"
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={disabled || !speechEnabled || speechSupported === false}
          aria-pressed={isRecording}
          aria-label={isRecording ? "Stop voice input" : "Start voice input"}
          title={isRecording ? "Stop recording" : !speechEnabled ? "Voice input disabled for this session" : speechSupported === false ? "Voice input not supported" : "Start voice input"}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all sm:h-11 sm:w-11 ${
            isRecording
              ? "bg-red-100 text-red-600 animate-pulse"
              : speechSupported === false
                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                : !speechEnabled
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600"
          } disabled:opacity-40`}
        >
          {isRecording
            ? <StopCircle className="h-5 w-5" />
            : <Mic className="h-5 w-5" />
          }
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputMessage.trim() || disabled || isOverLimit}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>

      {/* Character counter — only shown when typing */}
      {charCount > 0 && (
        <div className={`mt-1 text-right text-xs pr-1 ${
          isOverLimit
            ? "text-red-500 font-semibold"
            : isNearLimit
              ? "text-amber-500"
              : "text-slate-400"
        }`}>
          {charCount}/{MAX_MESSAGE_LENGTH}
          {isOverLimit && <span className="ml-1">— message too long</span>}
        </div>
      )}
    </div>
  );
};

export default ChatInput;
