
import React from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
}

const MessageList = ({ messages, participantColors = {} }: MessageListProps) => {
  return (
    <div className="h-[calc(100vh-400px)] overflow-y-auto p-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.sender === "assistant" ? "justify-start" : "justify-end"
          }`}
        >
          <div
            className={cn(
              "max-w-[80%] p-4 rounded-2xl",
              message.sender === "assistant"
                ? "bg-accent text-accent-foreground"
                : "text-primary-foreground",
              message.isReport && "bg-green-50 border border-green-200 w-full max-w-full"
            )}
            style={{
              backgroundColor: message.sender === "user" && message.participant 
                ? participantColors[message.participant]
                : undefined
            }}
          >
            {message.sender === "user" && message.participant && (
              <div className="text-xs opacity-75 mb-1">
                {message.participant}
              </div>
            )}
            {message.isReport && (
              <div className="font-semibold mb-2 text-green-700">
                Session Report
              </div>
            )}
            {message.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
