
import React from 'react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  content: string;
  sender: "user" | "assistant";
  isReport?: boolean;
  participantName?: string;
  backgroundColor?: string;
  isFirstMessageOfGroup: boolean;
}

const MessageBubble = ({ 
  content, 
  sender, 
  isReport = false, 
  participantName,
  backgroundColor,
  isFirstMessageOfGroup
}: MessageBubbleProps) => {
  return (
    <div
      className={cn(
        "max-w-[80%] px-4 py-2 rounded-2xl shadow-sm",
        sender === "assistant"
          ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
          : "text-gray-800 rounded-tr-none",
        isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-tl-2xl",
        isFirstMessageOfGroup && "mt-2"
      )}
      style={{
        backgroundColor
      }}
    >
      {(sender === "user" && participantName && isFirstMessageOfGroup) && (
        <div 
          className="text-xs font-medium mb-1"
          style={{
            color: "#1A1F2C",
            opacity: 0.8
          }}
        >
          {participantName}
        </div>
      )}
      {isReport && (
        <div className="font-semibold mb-2 text-green-700">
          Session Report
        </div>
      )}
      <div className="whitespace-pre-wrap break-words text-[15px]">
        {content}
      </div>
    </div>
  );
};

export default MessageBubble;
