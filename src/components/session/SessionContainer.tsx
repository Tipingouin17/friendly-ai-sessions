
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import ParticipantSelector from "./ParticipantSelector";
import { Message } from "@/types/chat";

interface SessionContainerProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
  };
  objective?: string;
  participantCount: number;
  messages: Message[];
  participantColors: { [key: string]: string };
  currentParticipant: number;
  inputMessage: string;
  isRecording: boolean;
  onParticipantSwitch: (num: number) => void;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  setIsRecording: (isRecording: boolean) => void;
}

const SessionContainer = ({
  facilitator,
  objective,
  participantCount,
  messages,
  participantColors,
  currentParticipant,
  inputMessage,
  isRecording,
  onParticipantSwitch,
  setInputMessage,
  onSendMessage,
  setIsRecording,
}: SessionContainerProps) => {
  return (
    <div className="min-h-screen pt-16 bg-[#FFC107]/10">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <ChatHeader 
            title={facilitator?.title}
            objective={objective}
            profilePicture={facilitator?.profile_picture}
            participantCount={participantCount}
          />
          <MessageList 
            messages={messages} 
            participantColors={participantColors}
          />
          <ParticipantSelector
            participantCount={participantCount}
            currentParticipant={currentParticipant}
            onParticipantSwitch={onParticipantSwitch}
          />
          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            onSendMessage={onSendMessage}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
          />
        </div>
      </div>
    </div>
  );
};

export default SessionContainer;
