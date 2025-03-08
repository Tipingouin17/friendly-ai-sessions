
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
  canSwitchParticipants?: boolean;
  currentUserParticipantId?: number | null;
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
  setIsRecording,
  canSwitchParticipants = true,
  currentUserParticipantId
}: InputFooterProps) => {
  // Determine whether participant switching is allowed
  const allowParticipantSwitch = canSwitchParticipants && !currentUserParticipantId;
  
  // Handle participant switch attempts when not allowed
  const handleParticipantSwitch = (num: number) => {
    if (allowParticipantSwitch) {
      onParticipantSwitch(num);
    } else if (num !== currentUserParticipantId) {
      // Prevent switching to other participants for guests
      console.log("Participant switching not allowed for guests");
    }
  };
  
  return (
    <>
      <ParticipantSelector
        participantCount={participantCount}
        currentParticipant={currentParticipant}
        onParticipantSwitch={handleParticipantSwitch}
        participantNames={participantNames}
        participants={participants}
        disableSwitching={!allowParticipantSwitch}
        currentUserParticipantId={currentUserParticipantId}
      />
      <div className="w-full border-t border-gray-100 bg-white/80 backdrop-blur-sm">
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          onSendMessage={onSendMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          placeholder={`Type as ${participants.find(p => p.id === currentParticipant)?.name || `Participant ${currentParticipant}`}...`}
        />
      </div>
    </>
  );
};

export default InputFooter;
