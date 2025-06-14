
import React from 'react';
import { cn } from '@/lib/utils';
import { EyeOff, UserCog } from 'lucide-react';

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
  // Improve responsive sizing for better width adaptation
  const maxWidth = isMobile ? "max-w-[85%] min-w-[50%]" : "max-w-[75%] min-w-[200px]";
  const padding = isMobile ? "px-3 py-2" : "px-4 py-3";
  const fontSize = isMobile ? "text-[14px]" : "text-[15px]";
  const nameSize = isMobile ? "text-[11px]" : "text-xs";

  return (
    <div
      className={cn(
        maxWidth, padding, "rounded-lg shadow-sm message-width-control",
        sender === "assistant"
          ? "bg-white text-gray-800 rounded-tl-sm border border-gray-100"
          : sender === "admin"
          ? "bg-blue-50 text-blue-900 rounded-tl-sm border border-blue-200"
          : "text-gray-800 rounded-tr-sm",
        isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-tl-lg",
        isFirstMessageOfGroup && "mt-1"
      )}
      style={{
        backgroundColor: sender === "user" ? backgroundColor || "#FFC8C8" : undefined,
        wordBreak: "break-word",
        direction: "ltr", // Enforce left-to-right direction for all messages
        textAlign: "left"
      }}
    >
      {/* Admin badge for admin messages */}
      {sender === "admin" && isFirstMessageOfGroup && (
        <div className={cn(nameSize, "font-medium mb-1 flex items-center gap-1 text-blue-700")}>
          <UserCog className="h-3 w-3" />
          Admin
        </div>
      )}

      {/* Participant name for user messages */}
      {(sender === "user" && participantName && isFirstMessageOfGroup) && (
        <div 
          className={cn(
            nameSize, "font-medium mb-1 flex items-center gap-1",
            isAnonymous && "italic"
          )}
          style={{
            color: "#1A1F2C",
            opacity: 0.8
          }}
        >
          {participantName}
          {isAnonymous && <EyeOff className="h-3 w-3 opacity-70" />}
        </div>
      )}

      {/* Report header */}
      {isReport && (
        <div className="font-semibold mb-2 text-green-700">
          Session Report
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
