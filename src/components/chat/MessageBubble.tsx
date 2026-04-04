/**
 * Message Bubble
 *
 * Chat component for the AIfacilitator application.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  sender: "user" | "assistant" | "admin";
  isReport?: boolean;
  participantName?: string;
  backgroundColor?: string;
  isFirstMessageOfGroup: boolean;
  isAnonymous?: boolean;
  isMobile?: boolean;
  isCurrentUser?: boolean;
}

const MessageBubble = ({
  content,
  sender,
  isReport = false,
  participantName,
  backgroundColor,
  isFirstMessageOfGroup,
  isAnonymous = false,
  isMobile = false,
  isCurrentUser = false,
}: MessageBubbleProps) => {
  const padding = isMobile ? "px-3.5 py-2.5" : "px-4 py-3";
  const fontSize = isMobile ? "text-sm leading-relaxed" : "text-[15px] leading-relaxed";
  const nameSize = "text-[11px] font-semibold tracking-wide uppercase";

  // ─── Host announcement (admin) ─────────────────────────────────────────────
  // Rendered as a centered pill — not a chat bubble
  if (sender === "admin") {
    return (
      <div className="flex justify-center w-full my-1">
        <div
          className={cn(
            "inline-flex items-start gap-2 rounded-full px-4 py-2",
            "bg-blue-50 border border-blue-200 text-blue-800",
            isMobile ? "max-w-[92%]" : "max-w-[70%]"
          )}
          style={{ wordBreak: "break-word" }}
        >
          <span className="text-blue-400 mt-0.5 shrink-0 text-xs font-bold">📣</span>
          <span className={cn("text-sm leading-relaxed", isMobile && "text-xs")}>{content}</span>
        </div>
      </div>
    );
  }

  // ─── Facilitator (assistant) ───────────────────────────────────────────────
  if (sender === "assistant") {
    if (isReport) {
      return (
        <div
          className={cn(
            "rounded-2xl shadow-sm w-full",
            padding,
            "bg-emerald-50 border border-emerald-200 text-gray-800"
          )}
          style={{ wordBreak: "break-word" }}
        >
          <div className="font-semibold mb-2 text-emerald-700 text-sm">Session Report</div>
          <div className={cn("whitespace-pre-wrap break-words text-gray-800", fontSize)} dir="auto">
            {content}
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm shadow-sm",
          isMobile ? "max-w-[88%]" : "max-w-[76%]",
          padding,
          // Soft lavender background with a left accent border
          "bg-slate-50 border border-slate-200 border-l-4 border-l-indigo-400 text-gray-800"
        )}
        style={{ wordBreak: "break-word", direction: "ltr", textAlign: "left" }}
      >
        {/* Facilitator label — shown only on first message of group */}
        {isFirstMessageOfGroup && (
          <div className={cn(nameSize, "mb-2 text-indigo-500 flex items-center gap-1")}>
            Facilitator
          </div>
        )}
        <div className={cn("whitespace-pre-wrap break-words text-gray-800", fontSize)} dir="auto">
          {content}
        </div>
      </div>
    );
  }

  // ─── Participant (user) ────────────────────────────────────────────────────
  // Current user: right-aligned indigo fill
  // Other participants: left-aligned neutral grey
  if (isCurrentUser) {
    return (
      <div
        className={cn(
          "rounded-2xl rounded-tr-sm shadow-sm",
          isMobile ? "max-w-[85%]" : "max-w-[72%]",
          padding,
          "bg-indigo-600 text-white"
        )}
        style={{ wordBreak: "break-word", direction: "ltr", textAlign: "left" }}
      >
        {isAnonymous && isFirstMessageOfGroup && (
          <div className={cn(nameSize, "mb-1.5 flex items-center gap-1 text-indigo-200")}>
            <EyeOff className="h-3 w-3" />
            Anonymous
          </div>
        )}
        <div className={cn("whitespace-pre-wrap break-words", fontSize)} dir="auto">
          {content}
        </div>
      </div>
    );
  }

  // Other participant
  return (
    <div
      className={cn(
        "rounded-2xl rounded-tl-sm shadow-sm",
        isMobile ? "max-w-[85%]" : "max-w-[72%]",
        padding,
        "text-gray-900"
      )}
      style={{
        backgroundColor: backgroundColor || "#F1F5F9",
        wordBreak: "break-word",
        direction: "ltr",
        textAlign: "left"
      }}
    >
      {participantName && isFirstMessageOfGroup && (
        <div
          className={cn(nameSize, "mb-1.5 flex items-center gap-1", isAnonymous && "italic")}
          style={{ color: "#475569" }}
        >
          {participantName}
          {isAnonymous && <EyeOff className="h-3 w-3 opacity-70" />}
        </div>
      )}
      <div className={cn("whitespace-pre-wrap break-words", fontSize)} dir="auto">
        {content}
      </div>
    </div>
  );
};

export default MessageBubble;
