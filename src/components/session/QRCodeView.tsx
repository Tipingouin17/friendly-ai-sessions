
import React from 'react';
import { Button } from "@/components/ui/button";
import SessionJoinInfo from "./SessionJoinInfo";

interface QRCodeViewProps {
  conversationId: number;
  currentParticipantCount: number;
  maxParticipants: number;
  facilitatorTitle?: string;
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const QRCodeView: React.FC<QRCodeViewProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  joinToken,
  onStartSession,
  onSessionFull
}) => {
  const handleStartClick = () => {
    onStartSession();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center py-6 sm:py-12 px-4">
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
            joinToken={joinToken}
          />
          
          <Button 
            onClick={handleStartClick}
            className="mt-4 sm:mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-black"
          >
            Start Session
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeView;
