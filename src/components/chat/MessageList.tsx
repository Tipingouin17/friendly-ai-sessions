
import React from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
}

const MessageList = ({ messages, participantColors = {} }: MessageListProps) => {
  return (
    <div className="h-[calc(100vh-400px)] overflow-y-auto p-6 space-y-4 bg-[#F0F2F5]">
      {messages.map((message, index) => {
        const isFirstMessageOfGroup = index === 0 || 
          messages[index - 1].sender !== message.sender || 
          messages[index - 1].participant !== message.participant;

        return (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.sender === "assistant" ? "justify-start" : "justify-end",
              !isFirstMessageOfGroup && "mt-1"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] px-4 py-2 rounded-2xl relative",
                message.sender === "assistant"
                  ? "bg-white text-gray-800 rounded-tl-none"
                  : "text-gray-800 rounded-tr-none",
                message.isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-tl-2xl"
              )}
              style={{
                backgroundColor: message.sender === "user" && message.participant 
                  ? participantColors[message.participant]
                  : message.sender === "assistant" ? "#FFFFFF" : undefined,
              }}
            >
              {(message.sender === "user" && message.participant && isFirstMessageOfGroup) && (
                <div 
                  className="text-xs font-medium mb-1"
                  style={{
                    color: message.sender === "user" ? "#1A1F2C" : undefined,
                    opacity: 0.8
                  }}
                >
                  {message.participant}
                </div>
              )}
              {message.isReport && (
                <div className="font-semibold mb-2 text-green-700">
                  Session Report
                </div>
              )}
              <div className="whitespace-pre-wrap break-words">
                {message.content}
              </div>
              <div className="text-[10px] text-gray-500 text-right mt-1">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MessageList;
