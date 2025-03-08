
import React from 'react';
import { Clock, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ParticipantWaitingScreenProps {
  currentParticipantCount: number;
  maxParticipants?: number;
  facilitatorTitle?: string;
}

const ParticipantWaitingScreen: React.FC<ParticipantWaitingScreenProps> = ({
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFC107]/5 to-white flex items-center justify-center py-6 sm:py-12 px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-500" />
        </div>
        
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Waiting for Session to Begin</h2>
        
        <p className="text-gray-600 mb-6">
          {facilitatorTitle 
            ? `You've joined the session with ${facilitatorTitle}` 
            : 'You have successfully joined the session'}
        </p>
        
        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-6">
          <p className="text-amber-800 mb-2 font-medium">The admin will start the session soon</p>
          <p className="text-amber-700 text-sm">Please stay on this page. The session will begin automatically.</p>
        </div>
        
        <div className="inline-flex items-center gap-2 bg-gray-50 rounded-full px-4 py-2 border mb-2">
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">
            {currentParticipantCount} {maxParticipants ? `of ${maxParticipants}` : ''} participants joined
          </span>
        </div>
      </div>
    </div>
  );
};

export default ParticipantWaitingScreen;
