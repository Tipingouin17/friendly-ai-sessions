
import React, { useEffect, useRef } from 'react';
import { Message, ParticipantInfo } from '@/types/chat';
import { cn } from '@/lib/utils';
import { getParticipantColor } from '@/utils/sessionHelpers';
import { Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserRound } from 'lucide-react';
import BoringAvatar from 'boring-avatars';

interface MessageListProps {
  messages: Message[];
  participantColors?: {[key: string]: string};
  currentParticipant?: string;
  onLikeMessage?: (messageId: string) => void;
  isWaitingForResponse?: boolean;
  participants?: ParticipantInfo[];
}

const MessageList = ({ 
  messages, 
  participantColors = {},
  currentParticipant,
  onLikeMessage,
  isWaitingForResponse = false,
  participants = []
}: MessageListProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isWaitingForResponse]);

  // Helper to render avatar
  const renderAvatar = (avatarUrl: string | undefined, name: string) => {
    if (avatarUrl?.startsWith('/api/avatar')) {
      // Use boring-avatars for dynamically generated avatars
      const params = new URLSearchParams(avatarUrl.split('?')[1]);
      const avatarName = params.get('name') || name;
      const variant = params.get('variant') || 'marble';
      const paletteIndex = parseInt(params.get('palette') || '0');
      
      // Default palettes matching those in ParticipantSetup
      const AVATAR_PALETTES = [
        ['#92A1C6', '#146A7C', '#F0AB3D', '#C271B4', '#C20D90'],
        ['#FFAD08', '#EDD75A', '#73B06F', '#0C8F8F', '#405059'],
        ['#2E94B9', '#FFC89D', '#FC766A', '#5B84B1', '#5F4B8B'],
        ['#F4B674', '#C574B5', '#F54768', '#342D7E', '#0E7A6C'],
        ['#D9A5B3', '#F5D6C6', '#F7EBD9', '#36382E', '#7FACAA'],
        ['#FFD5C2', '#F28F3B', '#C8553D', '#588B8B', '#1B98E0'],
        ['#94C9A9', '#FFC09F', '#FFEE93', '#FCB0B3', '#B0DEFF'],
        ['#71A2B6', '#C6CDF7', '#D8BFD8', '#E4D3B0', '#D9D9F3'],
      ];
      
      return (
        <div className="overflow-hidden rounded-full">
          <BoringAvatar
            size={32}
            name={avatarName}
            variant={variant as any}
            colors={AVATAR_PALETTES[paletteIndex]}
            square={false}
          />
        </div>
      );
    }
    
    // Fallback to regular avatar
    return (
      <Avatar className="w-8 h-8">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>
          <UserRound className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
    );
  };

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

          // Get participant info if this is a user message
          let participantInfo = null;
          if (message.sender === "user" && message.participant && message.participant.startsWith('P')) {
            const participantNumber = parseInt(message.participant.slice(1));
            participantInfo = participants.find(p => p.id === participantNumber);
          }

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
                
                {message.sender === "assistant" && isFirstMessageOfGroup && (
                  <div className="mb-1">
                    {renderAvatar(message.avatar, "Facilitator")}
                  </div>
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
                      {participantInfo?.name || message.participant}
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
                
                {message.sender === "user" && isFirstMessageOfGroup && (
                  <div className="mb-1">
                    {renderAvatar(participantInfo?.avatar, participantInfo?.name || "User")}
                  </div>
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
