
import React from 'react';
import ParticipantSelector from "./ParticipantSelector";
import ChatInput from "@/components/chat/ChatInput";
import { ParticipantInfo } from "@/types/chat";

interface InputFooterProps {
  participantCount: number;
  currentParticipant: number;
  onParticipantSwitch: (num: number) => void;
  participantNames: { [key: number]: string };
  participants: ParticipantInfo[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
}

const InputFooter = ({
  participantCount,
  currentParticipant,
  onParticipantSwitch,
  participantNames,
  participants,
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording
}: InputFooterProps) => {
  return (
    <>
      <ParticipantSelector
        participantCount={participantCount}
        currentParticipant={currentParticipant}
        onParticipantSwitch={onParticipantSwitch}
        participantNames={participantNames}
        participants={participants}
      />
      <div className="w-full border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
        />
      </div>
    </>
  );
};

export default InputFooter;
