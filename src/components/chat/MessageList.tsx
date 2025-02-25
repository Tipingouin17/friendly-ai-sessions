
import React from 'react';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
}

const MessageList = ({ messages, participantColors = {} }: MessageListProps) => {
  return (
    <div className="space-y-4">
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
                ? "bg-[#FFC107]/10 text-gray-800"
                : "text-gray-800"
            }`}
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
            {message.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
