
import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { getParticipantColor } from '@/utils/sessionHelpers';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
}

const MessageList = ({ messages, participantColors = {} }: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isFirstMessageOfGroup = index === 0 || 
            messages[index - 1].sender !== message.sender || 
            messages[index - 1].participant !== message.participant;
          
          const isLastMessageOfGroup = index === messages.length - 1 || 
            messages[index + 1].sender !== message.sender || 
            messages[index + 1].participant !== message.participant;

          const messageColor = message.sender === "user" && message.participant
            ? (participantColors[message.participant] || getParticipantColor(message.participant))
            : message.sender === "assistant" ? "#FFFFFF" : undefined;

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
                  "max-w-[80%] px-4 py-2 rounded-2xl shadow-sm",
                  message.sender === "assistant"
                    ? "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                    : "text-gray-800 rounded-tr-none",
                  message.isReport && "bg-green-50 border border-green-200 w-full max-w-full rounded-tl-2xl",
                  isFirstMessageOfGroup && "mt-2"
                )}
                style={{
                  backgroundColor: messageColor
                }}
              >
                {(message.sender === "user" && message.participant && isFirstMessageOfGroup) && (
                  <div 
                    className="text-xs font-medium mb-1"
                    style={{
                      color: "#1A1F2C",
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
                <div className="whitespace-pre-wrap break-words text-[15px]">
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
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
