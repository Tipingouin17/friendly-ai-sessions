/**
 * Session Info Panel
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Target, User } from 'lucide-react';
import { ParticipantInfo } from '@/types/chat';

interface SessionInfoPanelProps {
  conversationData: any;
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
  className?: string;
}

const SessionInfoPanel: React.FC<SessionInfoPanelProps> = ({
  conversationData,
  participants,
  currentParticipantCount,
  maxParticipants,
  className = ""
}) => {
  const facilitatorInfo = conversationData?.sessions?.facilitator_details;
  const sessionTitle = conversationData?.sessions?.title || "Workshop Session";
  const sessionObjective = conversationData?.sessions?.objective || conversationData?.sessions?.welcome_message;
  
  return (
    <div className={`w-80 bg-gray-50 border-l border-gray-200 flex flex-col ${className}`}>
      <div className="p-4 space-y-4 overflow-y-auto">
        
        {/* Session Title */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-600" />
              Session Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">{sessionTitle}</h3>
              {sessionObjective && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {sessionObjective}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Facilitator Info - Enhanced */}
        {facilitatorInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-blue-600" />
                Facilitator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Facilitator Avatar and Name */}
              <div className="flex flex-col items-center text-center space-y-3">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={facilitatorInfo.profile_picture} 
                    alt={facilitatorInfo.title}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-lg">
                    {facilitatorInfo.title?.charAt(0) || 'F'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {facilitatorInfo.title}
                  </h3>
                </div>
              </div>
              
              {/* Facilitator Details */}
              {facilitatorInfo.details && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">About</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {facilitatorInfo.details}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SessionInfoPanel;
