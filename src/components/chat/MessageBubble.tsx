
import React from 'react';
import { cn } from '@/lib/utils';
import { EyeOff } from 'lucide-react';

interface MessageBubbleProps {
  content: string;
  sender: "user" | "assistant";
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
  // Use responsive sizing
  const maxWidth = isMobile ? "max-w-[85%]" : "max-w-[80%]";
  const padding = isMobile ? "px-3 py-2" : "px-4 py-2";
  const fontSize = isMobile ? "text-[14px]" : "text-[15px]";
  const nameSize = isMobile ? "text-[10px]" : "text-xs";

  return (
    <div
      className={cn(
        maxWidth, padding, "rounded-2xl shadow-sm",
        sender === "assistant"
          ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
          : "text-gray-800 rounded-tr-none",
        isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-tl-2xl",
        isFirstMessageOfGroup && "mt-1"
      )}
      style={{
        backgroundColor
      }}
    >
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
      <div className={cn("whitespace-pre-wrap break-words", fontSize)}>
        {content}
      </div>
    </div>
  );
};

export default MessageBubble;
