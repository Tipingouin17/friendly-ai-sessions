/**
 * Mobile Session Info Sheet
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Info, Users, Clock, Target, User } from 'lucide-react';
import { ParticipantInfo } from '@/types/chat';
import { useSessionTimer } from '@/hooks/useSessionTimer';
import SessionTimerBadge from './SessionTimerBadge';

interface MobileSessionInfoSheetProps {
  conversationData: any;
  participants: ParticipantInfo[];
  currentParticipantCount: number;
  maxParticipants: number;
}

const MobileSessionInfoSheet: React.FC<MobileSessionInfoSheetProps> = ({
  conversationData,
  participants,
  currentParticipantCount,
  maxParticipants,
}) => {
  const facilitatorInfo = conversationData?.sessions?.facilitator_details;
  const sessionTitle = conversationData?.sessions?.title || "Workshop Session";
  const sessionObjective = conversationData?.sessions?.objective || conversationData?.sessions?.welcome_message;
  const hasDuration = !!(conversationData?.session_duration_minutes || conversationData?.sessions?.duration_minutes);
  const timer = useSessionTimer(conversationData ?? null, false);
  
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Info className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Session Information
          </SheetTitle>
          <SheetDescription>
            Details about this workshop session
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Session Title and Objective */}
          <div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">{sessionTitle}</h3>
            {sessionObjective && (
              <p className="text-gray-600 leading-relaxed">
                {sessionObjective}
              </p>
            )}
          </div>

          <Separator />

          {/* Facilitator Info */}
          {facilitatorInfo && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Facilitator
              </h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage 
                    src={facilitatorInfo.profile_picture} 
                    alt={facilitatorInfo.title}
                  />
                  <AvatarFallback className="bg-indigo-100 text-indigo-700">
                    {facilitatorInfo.title?.charAt(0) || 'F'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900">
                    {facilitatorInfo.title}
                  </p>
                  {facilitatorInfo.details && (
                    <p className="text-sm text-gray-500">
                      {facilitatorInfo.details}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Live Timer */}
          {timer && hasDuration && (
            <div>
              <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time Remaining
              </h4>
              <SessionTimerBadge timer={timer} showAddTime={false} />
            </div>
          )}

          {timer && hasDuration && <Separator />}

          {/* Session Stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="h-4 w-4" />
                <span>Participants</span>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {currentParticipantCount}/{maxParticipants}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Status</span>
              </div>
              <Badge className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSessionInfoSheet;
