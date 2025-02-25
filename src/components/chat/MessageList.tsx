
import React from 'react';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
}

const MessageList = ({ messages }: MessageListProps) => {
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
            className={`max-w-[80%] p-4 rounded-2xl ${
              message.sender === "assistant"
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {message.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
