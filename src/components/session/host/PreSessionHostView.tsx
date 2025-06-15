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
  const {
    toast
  } = useToast();
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
  return <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          
          
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code and Link Section */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Participant Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-sm">
                  <QRCodeSVG value={sessionLink} size={200} />
                </div>
                <p className="text-sm text-gray-600 mt-3 text-center">
                  Participants can scan this QR code to join
                </p>
              </div>

              {/* Session Link */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Session Link</label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-lg border text-sm font-mono truncate">
                    {sessionLink}
                  </div>
                  <Button onClick={handleCopyLink} size="sm" variant="outline" className="flex items-center gap-1 px-4">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>

              {/* Participant Status */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900">Participants Waiting</h4>
                    <p className="text-sm text-blue-700">
                      {participantCount} of {conversationData?.participants || 10} joined
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    {participantCount}
                  </Badge>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-3">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
                  width: `${Math.min(100, participantCount / (conversationData?.participants || 10) * 100)}%`
                }} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Information */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Session Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Session Title */}
              <div>
                <label className="text-sm font-medium text-gray-700">Session Title</label>
                <h3 className="text-xl font-semibold text-gray-900 mt-1">{sessionTitle}</h3>
              </div>

              {/* Facilitator */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Facilitated by</p>
                  <p className="font-medium text-gray-900">{facilitatorTitle}</p>
                </div>
              </div>

              {/* Objective */}
              <div>
                <label className="text-sm font-medium text-gray-700">Session Objective</label>
                <p className="text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">{objective}</p>
              </div>

              {/* Session Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Clock className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">~30-60 min</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <Users className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                  <p className="text-sm text-gray-600">Max Participants</p>
                  <p className="font-medium">{conversationData?.participants || 10}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions and Start Button */}
        <Card className="bg-white shadow-lg mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Begin?</h3>
                <p className="text-gray-600">
                  Once participants have joined, click "Start Session" to begin the facilitated discussion.
                  {participantCount === 0 && " You need at least one participant to start."}
                </p>
              </div>
              <div className="flex-shrink-0">
                <StartSessionButton onStartSession={onSessionStarted} participantCount={participantCount} isSessionStarted={false} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default PreSessionHostView;