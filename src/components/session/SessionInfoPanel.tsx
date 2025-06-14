
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, Clock, Target, User } from 'lucide-react';
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
              <Target className="h-5 w-5 text-amber-600" />
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

        {/* Facilitator Info */}
        {facilitatorInfo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Facilitator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={facilitatorInfo.profile_picture} 
                    alt={facilitatorInfo.title}
                  />
                  <AvatarFallback className="bg-amber-100 text-amber-700">
                    {facilitatorInfo.title?.charAt(0) || 'F'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {facilitatorInfo.title}
                  </p>
                  {facilitatorInfo.details && (
                    <p className="text-xs text-gray-500 truncate">
                      {facilitatorInfo.details}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Participants Count */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Participants</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {currentParticipantCount}/{maxParticipants}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Session Status */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Status</span>
              </div>
              <Badge className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionInfoPanel;
