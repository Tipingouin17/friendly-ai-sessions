/**
 * Message Bubble
 *
 * Chat component for the AIfacilitator application.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { EyeOff, UserCog, Bot } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  sender: "user" | "assistant" | "admin";
  isReport?: boolean;
  participantName?: string;
  backgroundColor?: string;
  isFirstMessageOfGroup: boolean;
  isAnonymous?: boolean;
  isMobile?: boolean;
}

const MessageBubble = ({ 
  content, 
  sender, 
  isReport = false, 
  participantName,
  backgroundColor,
  isFirstMessageOfGroup,
  isAnonymous = false,
  isMobile = false
}: MessageBubbleProps) => {
  const padding = isMobile ? "px-3 py-2.5" : "px-4 py-3";
  const fontSize = isMobile ? "text-[14px] leading-relaxed" : "text-[15px] leading-relaxed";
  const nameSize = isMobile ? "text-[11px]" : "text-xs";

  // ─── Facilitator (assistant) ───────────────────────────────────────────────
  if (sender === "assistant") {
    return (
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm shadow-sm",
          isMobile ? "max-w-[88%]" : "max-w-[78%]",
          padding,
          "bg-indigo-50 border border-indigo-200 text-gray-800",
          isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-2xl",
          isFirstMessageOfGroup && "mt-1"
        )}
        style={{ wordBreak: "break-word", direction: "ltr", textAlign: "left" }}
      >
        {/* Facilitator label — shown on first message of group */}
        {isFirstMessageOfGroup && !isReport && (
          <div className={cn(nameSize, "font-semibold mb-1.5 flex items-center gap-1.5 text-indigo-600")}>
            <Bot className="h-3.5 w-3.5" />
            Facilitator
          </div>
        )}

        {/* Report header */}
        {isReport && (
          <div className="font-semibold mb-2 text-green-700 flex items-center gap-1.5">
            <span>Session Report</span>
          </div>
        )}

        {/* Message content */}
        <div className={cn("whitespace-pre-wrap break-words text-gray-800", fontSize)} dir="auto">
          {content}
        </div>
      </div>
    );
  }

  // ─── Admin ─────────────────────────────────────────────────────────────────
  if (sender === "admin") {
    return (
      <div
        className={cn(
          "rounded-2xl rounded-tl-sm shadow-sm",
          isMobile ? "max-w-[88%]" : "max-w-[78%]",
          padding,
          "bg-blue-50 border border-blue-200 text-blue-900",
          isFirstMessageOfGroup && "mt-1"
        )}
        style={{ wordBreak: "break-word", direction: "ltr", textAlign: "left" }}
      >
        {isFirstMessageOfGroup && (
          <div className={cn(nameSize, "font-semibold mb-1.5 flex items-center gap-1 text-blue-700")}>
            <UserCog className="h-3 w-3" />
            Host
          </div>
        )}
        <div className={cn("whitespace-pre-wrap break-words", fontSize)} dir="auto">
          {content}
        </div>
      </div>
    );
  }

  // ─── Participant (user) ────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "rounded-2xl rounded-tr-sm shadow-sm",
        isMobile ? "max-w-[85%]" : "max-w-[75%]",
        padding,
        "text-gray-900",
        isFirstMessageOfGroup && "mt-1"
      )}
      style={{
        backgroundColor: backgroundColor || "#E0E7FF",
        wordBreak: "break-word",
        direction: "ltr",
        textAlign: "left"
      }}
    >
      {/* Participant name */}
      {sender === "user" && participantName && isFirstMessageOfGroup && (
        <div
          className={cn(
            nameSize, "font-semibold mb-1 flex items-center gap-1",
            isAnonymous && "italic"
          )}
          style={{ color: "#1A1F2C", opacity: 0.75 }}
        >
          {participantName}
          {isAnonymous && <EyeOff className="h-3 w-3 opacity-70" />}
        </div>
      )}

      {/* Message content */}
      <div className={cn("whitespace-pre-wrap break-words", fontSize)} dir="auto">
        {content}
      </div>
    </div>
  );
};

export default MessageBubble;
