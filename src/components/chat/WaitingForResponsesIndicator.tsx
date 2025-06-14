
import React from 'react';
import { Users, Clock } from 'lucide-react';

interface WaitingForResponsesIndicatorProps {
  currentResponses: number;
  totalParticipants: number;
  isMobile?: boolean;
}

const WaitingForResponsesIndicator: React.FC<WaitingForResponsesIndicatorProps> = ({
  currentResponses,
  totalParticipants,
  isMobile = false
}) => {
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] px-4 py-3 rounded-2xl shadow-sm bg-blue-50 text-blue-800 rounded-tl-none border border-blue-200 mt-2">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium">The facilitator is waiting for everyone to formulate an answer</span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-blue-600">
          <Users className="w-3 h-3" />
          <span>{currentResponses} of {totalParticipants} participants have responded</span>
        </div>
        {totalParticipants > 1 && (
          <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(currentResponses / totalParticipants) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default WaitingForResponsesIndicator;
