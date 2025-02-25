
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import ParticipantSelector from "./ParticipantSelector";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
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
          <div className="p-4 border-b border-gray-100 flex justify-end">
            <Button
              onClick={onGenerateReport}
              disabled={isGeneratingReport || messages.length === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              {isGeneratingReport ? "Generating Report..." : "Generate Report"}
            </Button>
          </div>
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
