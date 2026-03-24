
import React from 'react';
import { Button } from "@/components/ui/button";
import SessionJoinInfo from "./SessionJoinInfo";

interface QRCodeViewProps {
  conversationId: number;
  currentParticipantCount: number;
  maxParticipants: number;
  facilitatorTitle?: string;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const QRCodeView: React.FC<QRCodeViewProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onStartSession,
  onSessionFull
}) => {
  const handleStartClick = () => {
    onStartSession();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
      <div className="bg-white p-4 sm:p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 text-center">Join This Session</h2>
        <p className="text-gray-600 mb-4 sm:mb-6 text-center text-sm sm:text-base">
          {facilitatorTitle 
            ? `Session with ${facilitatorTitle}` 
            : 'Scan the QR code to join this session'}
        </p>
        
        <div className="flex flex-col items-center space-y-4 sm:space-y-6">
          <SessionJoinInfo 
            conversationId={conversationId} 
            currentParticipantCount={currentParticipantCount}
            maxParticipants={maxParticipants}
            onSessionFull={onSessionFull}
          />
          
          <Button 
            onClick={handleStartClick}
            className="mt-4 sm:mt-6 w-full bg-[#FFC107] hover:bg-[#F5B800] text-black"
          >
            Start Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeView;
