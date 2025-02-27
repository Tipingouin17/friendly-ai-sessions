
import React, { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { Heart } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
  currentParticipant?: string;
  onLikeMessage?: (messageId: string) => void;
  isWaitingForResponse?: boolean;
}

const MessageList = ({ 
  messages, 
  participantColors = {},
  currentParticipant,
  onLikeMessage,
  isWaitingForResponse = false
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWaitingForResponse]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 py-6 space-y-4">
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

          const isLikedByCurrentParticipant = message.likes?.includes(currentParticipant || '');
          const likeCount = message.likes?.length || 0;

          return (
            <div
              key={message.id}
              className={cn(
                "flex group",
                message.sender === "assistant" ? "justify-start" : "justify-end",
                !isFirstMessageOfGroup && "mt-1"
              )}
            >
              <div className="flex items-end gap-2">
                {message.sender === "assistant" && (
                  <button
                    onClick={() => onLikeMessage?.(message.id)}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity mb-2",
                      isLikedByCurrentParticipant && "opacity-100"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isLikedByCurrentParticipant 
                          ? "fill-purple-500 stroke-purple-500" 
                          : "stroke-gray-400 hover:stroke-purple-500"
                      )}
                    />
                    {likeCount > 0 && (
                      <span className="text-xs text-gray-500">{likeCount}</span>
                    )}
                  </button>
                )}
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
                </div>
                {message.sender !== "assistant" && (
                  <button
                    onClick={() => onLikeMessage?.(message.id)}
                    className={cn(
                      "opacity-0 group-hover:opacity-100 transition-opacity mb-2",
                      isLikedByCurrentParticipant && "opacity-100"
                    )}
                  >
                    <Heart 
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isLikedByCurrentParticipant 
                          ? "fill-purple-500 stroke-purple-500" 
                          : "stroke-gray-400 hover:stroke-purple-500"
                      )}
                    />
                    {likeCount > 0 && (
                      <span className="text-xs text-gray-500">{likeCount}</span>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Thinking indicator */}
        {isWaitingForResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-white text-gray-800 rounded-tl-none border border-gray-100 mt-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-300"></div>
                <span className="text-sm text-gray-500 ml-1">Facilitator is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
