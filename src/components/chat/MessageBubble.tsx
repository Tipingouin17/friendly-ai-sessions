/**
 * MessageBubble — World-class responsive redesign
 *
 * Design principles:
 * - Facilitator: clean white card with indigo left accent, generous padding, readable typography
 * - Current user: rich indigo fill, white text, right-aligned
 * - Other participants: soft neutral card with subtle color tint, left-aligned
 * - Admin announcement: centered pill with blue accent
 * - All bubbles: max-w responsive (wider on desktop, narrower on mobile)
 * - No isMobile prop — pure CSS responsive
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { EyeOff, Sparkles, Square, Volume2 } from 'lucide-react';
import { getSpeechLocale } from '@/utils/speechLocale';

interface MessageBubbleProps {
  content: string;
  sender: "user" | "assistant" | "admin";
  isReport?: boolean;
  participantName?: string;
  backgroundColor?: string;
  isFirstMessageOfGroup: boolean;
  isAnonymous?: boolean;
  isMobile?: boolean;      // kept for API compat, not used
  isCurrentUser?: boolean;
  speechLanguage?: string | null;
}

const MessageBubble = ({
  content,
  sender,
  isReport = false,
  participantName,
  backgroundColor,
  isFirstMessageOfGroup,
  isAnonymous = false,
  isCurrentUser = false,
  speechLanguage = null,
}: MessageBubbleProps) => {
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  React.useEffect(() => {
    return () => {
      if (isSpeaking && canSpeak) {
        window.speechSynthesis.cancel();
      }
    };
  }, [canSpeak, isSpeaking]);

  const togglePlayback = () => {
    if (!canSpeak || !content?.trim()) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = getSpeechLocale(speechLanguage);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.cancel();
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // ─── Admin announcement ────────────────────────────────────────────────────
  if (sender === "admin") {
    return (
      <div className="flex justify-center w-full my-2">
        <div className="inline-flex items-start gap-2 rounded-2xl px-4 py-2.5 bg-blue-50 border border-blue-200 text-blue-800 max-w-[90%] sm:max-w-[70%]">
          <span className="text-blue-500 shrink-0 text-sm mt-0.5">📣</span>
          <span className="text-sm leading-relaxed break-words" style={{ wordBreak: "break-word" }}>
            {content}
          </span>
        </div>
      </div>
    );
  }

  // ─── Session report ────────────────────────────────────────────────────────
  if (sender === "assistant" && isReport) {
    return (
      <div className="w-full rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-200 bg-emerald-100/60">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span className="text-sm font-semibold text-emerald-800">Session Report</span>
        </div>
        <div
          className="px-4 py-4 text-sm leading-relaxed text-gray-800 whitespace-pre-wrap break-words"
          style={{ wordBreak: "break-word" }}
        >
          {content}
        </div>
      </div>
    );
  }

  // ─── Facilitator (assistant) ───────────────────────────────────────────────
  if (sender === "assistant") {
    return (
      <div
        className="max-w-[88%] sm:max-w-[78%] rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm overflow-hidden"
        style={{ wordBreak: "break-word" }}
      >
        {isFirstMessageOfGroup && (
          <div className="flex items-center gap-1.5 px-4 pt-3 pb-0">
            <div className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-indigo-500 select-none">
              Facilitator
            </span>
            {canSpeak && (
              <button
                type="button"
                onClick={togglePlayback}
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label={isSpeaking ? "Stop facilitator read-aloud" : "Read facilitator message aloud"}
                title={isSpeaking ? "Stop read-aloud" : "Read this facilitator message aloud"}
              >
                {isSpeaking ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                <span>{isSpeaking ? 'Stop audio' : 'Read aloud'}</span>
              </button>
            )}
          </div>
        )}
        <div className="px-4 py-3 text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
          {content}
        </div>
        {isFirstMessageOfGroup && canSpeak && (
          <div className="px-4 pb-3 text-[11px] text-slate-400">
            Prefer listening? Use <span className="font-medium text-slate-500">Read aloud</span> above.
          </div>
        )}
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-400 via-violet-400 to-transparent" />
      </div>
    );
  }

  // ─── Current user ──────────────────────────────────────────────────────────
  if (isCurrentUser) {
    return (
      <div
        className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tr-none bg-indigo-600 shadow-sm px-4 py-3"
        style={{ wordBreak: "break-word" }}
      >
        {isFirstMessageOfGroup && isAnonymous && (
          <div className="flex items-center gap-1 mb-1.5">
            <EyeOff className="h-3 w-3 text-indigo-300" />
            <span className="text-[11px] font-semibold tracking-widest uppercase text-indigo-300">
              Anonymous
            </span>
          </div>
        )}
        <div className="text-[15px] leading-relaxed text-white whitespace-pre-wrap break-words">
          {content}
        </div>
      </div>
    );
  }

  // ─── Other participant ─────────────────────────────────────────────────────
  // Use the assigned color as a very light tint (10% opacity) for the background
  // so text always remains readable regardless of the participant color
  const tintColor = backgroundColor || "#6366f1";
  const nameColor = backgroundColor || "#475569";

  return (
    <div
      className="max-w-[85%] sm:max-w-[72%] rounded-2xl rounded-tl-none bg-white border border-slate-200 shadow-sm px-4 py-3"
      style={{
        wordBreak: "break-word",
        borderLeftColor: tintColor,
        borderLeftWidth: "3px",
      }}
    >
      {participantName && isFirstMessageOfGroup && (
        <div
          className="text-[11px] font-semibold tracking-widest uppercase mb-1.5 flex items-center gap-1"
          style={{ color: nameColor }}
        >
          {participantName}
          {isAnonymous && <EyeOff className="h-3 w-3 opacity-70" />}
        </div>
      )}
      <div className="text-[15px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  );
};

export default MessageBubble;
