
import React, { useState } from 'react';
import ChatHeader from "@/components/chat/ChatHeader";
import MessageList from "@/components/chat/MessageList";
import ChatInput from "@/components/chat/ChatInput";
import ParticipantSelector from "./ParticipantSelector";
import SessionJoinInfo from "./SessionJoinInfo";
import { Message, ParticipantInfo } from "@/types/chat";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

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
  isWaitingForResponse?: boolean;
  onParticipantSwitch: (num: number) => void;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  setIsRecording: (isRecording: boolean) => void;
  onGenerateReport?: () => void;
  participantNames?: { [key: number]: string };
  onLikeMessage?: (messageId: string) => void;
  participants?: ParticipantInfo[];
  conversationId?: number | null;
  conversation?: any;
  currentParticipantCount?: number;
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
  isWaitingForResponse = false,
  onParticipantSwitch,
  setInputMessage,
  onSendMessage,
  setIsRecording,
  onGenerateReport,
  participantNames = {},
  onLikeMessage,
  participants = [],
  conversationId,
  conversation,
  currentParticipantCount
}: SessionContainerProps) => {
  const { canGenerateReports } = usePlanLimits();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  
  const transformedMessages = messages.map(message => {
    if (message.participant && message.participant.startsWith('P')) {
      const participantNumber = parseInt(message.participant.slice(1));
      const participant = participants.find(p => p.id === participantNumber);
      
      if (participant) {
        return {
          ...message,
          participant: participant.name,
          avatar: participant.avatar
        };
      }
      
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

  // Check if we're on a mobile device
  const isMobile = window.innerWidth < 768;

  // Generate join URL
  const baseUrl = window.location.origin;
  const joinUrl = `${baseUrl}/join-session?id=${conversationId}`;

  return (
    <div className="h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex flex-col">
      <div className="container mx-auto h-full max-w-4xl flex flex-col pt-4 sm:pt-16">
        <div className="flex-1 bg-white rounded-t-lg sm:rounded-t-3xl shadow-lg flex flex-col relative">
          <ChatHeader 
            title={facilitator?.title}
            objective={objective}
            profilePicture={facilitator?.profile_picture}
            participantCount={currentParticipantCount || participants.length || participantCount}
            onGenerateReport={handleGenerateReport}
            isGeneratingReport={isGeneratingReport}
            canGenerateReport={messages.length > 0 && canGenerateReports}
          />
          <div className="flex-1 overflow-hidden flex flex-col sm:flex-row">
            <div className="flex-1 overflow-hidden order-2 sm:order-1">
              <MessageList 
                messages={transformedMessages} 
                participantColors={participantColors}
                currentParticipant={`P${currentParticipant}`}
                onLikeMessage={onLikeMessage}
                isWaitingForResponse={isWaitingForResponse}
                participants={participants}
              />
            </div>
            
            {!isMobile && (
              <div className="w-32 p-2 flex-shrink-0 border-l border-gray-100 order-1 sm:order-2">
                <SessionJoinInfo 
                  conversationId={conversationId || null} 
                  currentParticipantCount={currentParticipantCount || participants.length || 0}
                  maxParticipants={conversation?.participants || 0}
                />
              </div>
            )}
          </div>
          
          {isMobile && (
            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="absolute top-4 right-14 z-10"
                  onClick={() => setIsQrDialogOpen(true)}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join Session</DialogTitle>
                  <DialogDescription>
                    Share this link or QR code to invite others
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center">
                  <QrCode 
                    size={200}
                    className="w-40 h-40 my-4"
                    data-url={joinUrl}
                  />
                  <p className="text-sm text-center text-gray-500 mb-2">
                    {joinUrl}
                  </p>
                  <p className="text-xs text-center text-gray-500">
                    {currentParticipantCount || participants.length || 0} 
                    {conversation?.participants > 0 ? ` of ${conversation.participants}` : ''} participants
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
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
        </div>
      </div>
    </div>
  );
};

export default SessionContainer;
