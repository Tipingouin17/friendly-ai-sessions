
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Users, Clock, Target, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import StartSessionButton from './StartSessionButton';

interface PreSessionHostViewProps {
  conversationData: any;
  conversationId: number | null;
  participantCount: number;
  onSessionStarted: () => void;
}

const PreSessionHostView: React.FC<PreSessionHostViewProps> = ({
  conversationData,
  conversationId,
  participantCount,
  onSessionStarted
}) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  console.log("🔍 PreSessionHostView - Received props:", {
    conversationId,
    participantCount,
    conversationData: conversationData?.id
  });

  const sessionLink = conversationId ? `${window.location.origin}/join-session?id=${conversationId}` : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link copied!",
        description: "Session link has been copied to clipboard."
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Copy failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive"
      });
    }
  };

  const facilitatorTitle = conversationData?.sessions?.facilitator_details?.title || 'AI Facilitator';
  const sessionTitle = conversationData?.sessions?.title || 'Untitled Session';
  const objective = conversationData?.sessions?.objective || 'No objective specified';

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-4 md:mb-6">
          
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
          {/* QR Code and Link Section */}
          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Users className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                Participant Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-5 pt-0">
              {/* QR Code and Session Link - Side by side on desktop */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                {/* QR Code */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className="bg-white p-2 md:p-3 rounded-lg border-2 border-gray-200 shadow-sm">
                    <QRCodeSVG 
                      value={sessionLink} 
                      size={window.innerWidth < 640 ? 120 : 140} 
                    />
                  </div>
                  <p className="text-xs md:text-sm text-gray-600 mt-2 text-center">
                    Scan to join
                  </p>
                </div>

                {/* Session Link */}
                <div className="flex-1 w-full space-y-2">
                  <label className="text-xs md:text-sm font-medium text-gray-700">Session Link</label>
                  <div 
                    className="relative group cursor-pointer"
                    onClick={handleCopyLink}
                  >
                    <div className="flex-1 p-2 md:p-3 bg-gray-50 rounded-lg border text-xs md:text-sm font-mono break-all hover:bg-gray-100 transition-colors">
                      {sessionLink}
                    </div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Click to copy link</p>
                </div>
              </div>

              {/* Participant Status */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm md:text-base">Participants Waiting</h4>
                    <p className="text-xs md:text-sm text-blue-700">
                      {participantCount} of {conversationData?.participants || 10} joined
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Debug: participantCount = {participantCount}, type = {typeof participantCount}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm md:text-lg px-2 md:px-3 py-1">
                    {participantCount}
                  </Badge>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2 md:mt-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{
                      width: `${Math.min(100, participantCount / (conversationData?.participants || 10) * 100)}%`
                    }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Information */}
          <Card className="bg-white shadow-lg">
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Target className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-5 pt-0">
              {/* Session Title */}
              <div>
                <label className="text-xs md:text-sm font-medium text-gray-700">Session Title</label>
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mt-1">{sessionTitle}</h3>
              </div>

              {/* Facilitator */}
              <div className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-600">Facilitated by</p>
                  <p className="font-medium text-gray-900 text-sm md:text-base truncate">{facilitatorTitle}</p>
                </div>
              </div>

              {/* Objective */}
              <div>
                <label className="text-xs md:text-sm font-medium text-gray-700">Session Objective</label>
                <p className="text-gray-900 mt-1 p-2 md:p-3 bg-gray-50 rounded-lg text-xs md:text-sm leading-relaxed">
                  {objective}
                </p>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-xs md:text-sm text-gray-600">Duration</p>
                  <p className="font-medium text-xs md:text-sm">~30-60 min</p>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <Users className="h-4 w-4 md:h-5 md:w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-xs md:text-sm text-gray-600">Max Participants</p>
                  <p className="font-medium text-xs md:text-sm">{conversationData?.participants || 10}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions and Start Button */}
        <Card className="bg-white shadow-lg mt-4 md:mt-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Ready to Begin?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  Once participants have joined, click "Start Session" to begin the facilitated discussion.
                  {participantCount === 0 && " You need at least one participant to start."}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Debug: Button will be {participantCount === 0 ? 'DISABLED' : 'ENABLED'} (count: {participantCount})
                </p>
              </div>
              <div className="flex-shrink-0 w-full lg:w-auto">
                <StartSessionButton 
                  onStartSession={onSessionStarted} 
                  participantCount={participantCount} 
                  isSessionStarted={false} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PreSessionHostView;
