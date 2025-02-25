
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
  isGeneratingReport?: boolean;
  onParticipantSwitch: (num: number) => void;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  setIsRecording: (isRecording: boolean) => void;
  onGenerateReport?: () => void;
  participantNames?: { [key: number]: string };
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
  isGeneratingReport,
  onParticipantSwitch,
  setInputMessage,
  onSendMessage,
  setIsRecording,
  onGenerateReport,
  participantNames = {}
}: SessionContainerProps) => {
  // Transform messages to use actual names instead of P1, P2, etc.
  const transformedMessages = messages.map(message => ({
    ...message,
    participant: message.participant && message.participant.startsWith('P')
      ? participantNames[parseInt(message.participant.slice(1))] || message.participant
      : message.participant
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white">
      <div className="container mx-auto h-screen max-w-4xl flex flex-col pt-16">
        <div className="flex-1 bg-white rounded-t-3xl shadow-lg overflow-hidden flex flex-col">
          <ChatHeader 
            title={facilitator?.title}
            objective={objective}
            profilePicture={facilitator?.profile_picture}
            participantCount={participantCount}
            onGenerateReport={onGenerateReport}
            isGeneratingReport={isGeneratingReport}
            canGenerateReport={messages.length > 0}
          />
          <MessageList 
            messages={transformedMessages} 
            participantColors={participantColors}
          />
          <div className="border-t border-gray-100 bg-white/80 backdrop-blur-sm">
            <ParticipantSelector
              participantCount={participantCount}
              currentParticipant={currentParticipant}
              onParticipantSwitch={onParticipantSwitch}
              participantNames={participantNames}
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
    </div>
  );
};

export default SessionContainer;
