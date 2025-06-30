
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import StartSessionButton from './StartSessionButton';
import { Users, Calendar, Target, User } from 'lucide-react';

interface PreSessionHostViewProps {
  conversationData: any;
  conversationId: number | null;
  participantCount: number;
  onSessionStarted: () => void;
  isStartingSession?: boolean;
  startProgress?: string;
}

const PreSessionHostView: React.FC<PreSessionHostViewProps> = ({
  conversationData,
  conversationId,
  participantCount,
  onSessionStarted,
  isStartingSession = false,
  startProgress
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Session Ready to Start
          </h1>
          <p className="text-gray-600">
            Review your session details and start when ready
          </p>
        </div>

        {/* Session Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-700">Title</label>
                <p className="text-gray-900 mt-1">
                  {conversationData?.sessions?.title || 'Untitled Session'}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Facilitator</label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4 text-gray-500" />
                  <p className="text-gray-900">
                    {conversationData?.sessions?.facilitator_details?.title || 'Unknown Facilitator'}
                  </p>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700">Objective</label>
                <p className="text-gray-900 mt-1">
                  {conversationData?.sessions?.objective || 'No objective specified'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participants
              <Badge variant="secondary">
                {participantCount} joined
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">
                  {participantCount > 0 
                    ? `${participantCount} participant${participantCount === 1 ? '' : 's'} ready to begin`
                    : 'Waiting for participants to join...'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Maximum capacity: {conversationData?.participants || 10} participants
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Objective Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              What happens when you start?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <p className="font-medium">AI Welcome Message</p>
                  <p className="text-sm text-gray-600">
                    An AI-generated welcome message will be created based on your session details
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <p className="font-medium">Session Activation</p>
                  <p className="text-sm text-gray-600">
                    Participants will be able to see and respond to messages
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <p className="font-medium">Host View</p>
                  <p className="text-sm text-gray-600">
                    You'll be redirected to the active session monitoring view
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Session Button */}
        <div className="flex justify-center pt-6">
          <StartSessionButton
            onStartSession={onSessionStarted}
            participantCount={participantCount}
            isSessionStarted={false}
            isStartingSession={isStartingSession}
            startProgress={startProgress}
          />
        </div>
      </div>
    </div>
  );
};

export default PreSessionHostView;
