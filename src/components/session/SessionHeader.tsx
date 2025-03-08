
import React from 'react';
import ChatHeader from "@/components/chat/ChatHeader";

interface SessionHeaderProps {
  facilitator: {
    title?: string;
    profile_picture?: string;
  };
  objective?: string;
  participantCount: number;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
  canGenerateReports: boolean;
  messagesCount: number;
}

const SessionHeader = ({
  facilitator,
  objective,
  participantCount,
  onGenerateReport,
  isGeneratingReport,
  canGenerateReports,
  messagesCount
}: SessionHeaderProps) => {
  return (
    <ChatHeader 
      title={facilitator?.title}
      objective={objective}
      profilePicture={facilitator?.profile_picture}
      participantCount={participantCount}
      onGenerateReport={onGenerateReport}
      isGeneratingReport={isGeneratingReport}
      canGenerateReport={messagesCount > 0 && canGenerateReports}
    />
  );
};

export default SessionHeader;
