
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Target } from "lucide-react";
import StartSessionButton from "./StartSessionButton";

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
  startProgress = ""
}) => {
  const facilitatorDetails = conversationData?.sessions?.facilitator_details;
  const sessionTitle = conversationData?.sessions?.title || "Untitled Session";
  const sessionObjective = conversationData?.sessions?.objective || "No objective specified";
  const maxParticipants = conversationData?.participants || 10;

  return (
    <div className="flex flex-col h-full bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">{sessionTitle}</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{sessionObjective}</p>
          
          <div className="flex items-center justify-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {participantCount} / {maxParticipants} participants
            </Badge>
            <Badge variant="secondary">Pre-Session</Badge>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Session Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">Title</h4>
                <p className="text-gray-600">{sessionTitle}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Objective</h4>
                <p className="text-gray-600">{sessionObjective}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900">Capacity</h4>
                <p className="text-gray-600">{maxParticipants} maximum participants</p>
              </div>
            </CardContent>
          </Card>

          {/* Facilitator Info */}
          <Card>
            <CardHeader>
              <CardTitle>Facilitator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {facilitatorDetails ? (
                <>
                  <div className="flex items-center space-x-3">
                    {facilitatorDetails.profile_picture && (
                      <img
                        src={facilitatorDetails.profile_picture}
                        alt={facilitatorDetails.title}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{facilitatorDetails.title}</h4>
                      <p className="text-sm text-gray-600">{facilitatorDetails.expertise}</p>
                    </div>
                  </div>
                  
                  {facilitatorDetails.bio && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">About</h4>
                      <p className="text-gray-600 text-sm">{facilitatorDetails.bio}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No facilitator information available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Participant Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Participant Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-blue-600">{participantCount}</span>
                  <span className="text-gray-600">participants joined</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Waiting for session to start
                </div>
              </div>
              
              <StartSessionButton
                onStartSession={onSessionStarted}
                participantCount={participantCount}
                isSessionStarted={false}
                isStartingSession={isStartingSession}
                startProgress={startProgress}
              />
            </div>
            
            {participantCount === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Waiting for participants to join. Share the session link or QR code to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">1</div>
                <p>Share the session link or QR code with your participants</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">2</div>
                <p>Wait for participants to join (you can start with any number of participants)</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">3</div>
                <p>Click "Start Session" when you're ready to begin the facilitated discussion</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PreSessionHostView;
