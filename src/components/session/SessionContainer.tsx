
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import ParticipantSelector from "./ParticipantSelector";
import { Message } from "@/types/chat";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

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
  onLikeMessage?: (messageId: string) => void;
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
  participantNames = {},
  onLikeMessage
}: SessionContainerProps) => {
  const { canGenerateReports } = usePlanLimits();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Transform messages to use actual names instead of P1, P2, etc.
  const transformedMessages = messages.map(message => {
    if (message.participant && message.participant.startsWith('P')) {
      const participantNumber = parseInt(message.participant.slice(1));
      const name = participantNames[participantNumber];
      if (name) {
        return {
          ...message,
          participant: name
        };
      }
      return {
        ...message,
        participant: `Anonymous ${participantNumber}`
      };
    }
    return message;
  });
  
  const handleGenerateReport = () => {
    if (!canGenerateReports) {
      toast({
        title: "Feature Not Available",
        description: "Report generation is not available in your current plan. Please upgrade to generate session reports.",
        variant: "destructive",
      });
      
      return;
    }
    
    if (onGenerateReport) {
      onGenerateReport();
    }
  };
  
  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

  return (
    <div className="h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex flex-col">
      <div className="container mx-auto h-full max-w-4xl flex flex-col pt-16">
        <div className="flex-1 bg-white rounded-t-3xl shadow-lg flex flex-col relative">
          <ChatHeader 
            title={facilitator?.title}
            objective={objective}
            profilePicture={facilitator?.profile_picture}
            participantCount={participantCount}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
            canGenerateReport={messages.length > 0 && canGenerateReports}
            onUpgradePlan={!canGenerateReports ? handleUpgradePlan : undefined}
          />
          <div className="flex-1 overflow-hidden">
            <MessageList 
              messages={transformedMessages} 
              participantColors={participantColors}
              currentParticipant={`P${currentParticipant}`}
              onLikeMessage={onLikeMessage}
            />
          </div>
          <ParticipantSelector
            participantCount={participantCount}
            currentParticipant={currentParticipant}
            onParticipantSwitch={onParticipantSwitch}
            participantNames={participantNames}
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
        </div>
      </div>
    </div>
  );
};

export default SessionContainer;
