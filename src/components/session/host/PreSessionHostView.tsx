/**
 * Pre Session Host View
 *
 * Session component for the AIfacilitator application.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Users, Clock, Target, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import StartSessionButton from './StartSessionButton';
interface PreSessionHostViewProps {
  conversationData: any;
  conversationId: number | null;
  participantCount: number;
  onSessionStarted: () => void;
  isAutoStarting?: boolean;
  autoStartCountdown?: number;
  onCancelAutoStart?: () => void;
}
const PreSessionHostView: React.FC<PreSessionHostViewProps> = ({
  conversationData,
  conversationId,
  participantCount,
  onSessionStarted,
  isAutoStarting = false,
  autoStartCountdown = 0,
  onCancelAutoStart
}) => {
  const [copied, setCopied] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const {
    toast
  } = useToast();

  // Stabilize participant count to prevent rapid state changes
  const stableParticipantCount = useMemo(() => {
    const count = Number(participantCount) || 0;
    return count;
  }, [participantCount]);

  // Memoize session link to prevent unnecessary recalculations
  // Always include the join token so QR code / copied links work on mobile.
  const sessionLink = useMemo(() => {
    if (!conversationId) return '';
    const token = (conversationData as any)?.join_token;
    return token
      ? `${window.location.origin}/join-session?id=${conversationId}&token=${encodeURIComponent(token)}`
      : `${window.location.origin}/join-session?id=${conversationId}`;
  }, [conversationId, conversationData]);

  // Stable copy handler
  const handleCopyLink = useCallback(async () => {
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
  }, [sessionLink, toast]);

  // Stable session start handler with logging
  const handleSessionStart = useCallback(() => {
    onSessionStarted();
  }, [onSessionStarted, stableParticipantCount, conversationId]);

  // Determine if session data has loaded
  const isDataLoaded = !!conversationData?.sessions;

  // Memoize facilitator and session data — only use fallbacks when data is confirmed loaded
  const sessionInfo = useMemo(() => ({
    facilitatorTitle: isDataLoaded
      ? (conversationData?.sessions?.facilitator_details?.title || 'AI Facilitator')
      : null,
    sessionTitle: isDataLoaded
      ? (conversationData?.sessions?.title || 'Untitled Session')
      : null,
    objective: isDataLoaded
      ? (conversationData?.sessions?.objective || 'No objective specified')
      : null,
    durationMinutes: isDataLoaded
      ? (conversationData?.session_duration_minutes ?? conversationData?.sessions?.duration_minutes ?? null)
      : null
  }), [conversationData, isDataLoaded]);

  // Memoize participant progress calculation
  const participantProgress = useMemo(() => {
    const maxParticipants = conversationData?.participants || 10;
    const progressPercentage = Math.min(100, stableParticipantCount / maxParticipants * 100);
    return {
      current: stableParticipantCount,
      max: maxParticipants,
      percentage: progressPercentage
    };
  }, [stableParticipantCount, conversationData?.participants]);
  return <div className="min-h-full bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Ready to Begin Section */}
        <Card className="bg-white shadow-lg mb-4 md:mb-6">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 md:gap-6">
              <div className="text-center lg:text-left">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Ready to Begin?</h3>
                <p className="text-sm md:text-base text-gray-600">
                  Once participants have joined, click "Start Session" to begin the facilitated discussion.
                  {stableParticipantCount === 0 && " You need at least one participant to start."}
                </p>
                
              </div>
              <div className="flex-shrink-0 w-full lg:w-auto" style={{
              pointerEvents: 'auto'
            }}>
                <StartSessionButton onStartSession={handleSessionStart} participantCount={stableParticipantCount} isSessionStarted={false} isAutoStarting={isAutoStarting} autoStartCountdown={autoStartCountdown} onCancelAutoStart={onCancelAutoStart} />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  <div className="bg-white p-2 md:p-3 rounded-lg border-2 border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors" onClick={() => setIsQrDialogOpen(true)} title="Click to view larger QR code">
                    <QRCodeSVG value={sessionLink} size={window.innerWidth < 640 ? 120 : 140} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click to enlarge</p>
                </div>

                {/* Session Link */}
                <div className="flex-1 w-full space-y-2">
                  <div className="relative group cursor-pointer" onClick={handleCopyLink}>
                    <div className="flex-1 p-2 md:p-3 bg-gray-50 rounded-lg border text-xs md:text-sm font-mono break-all hover:bg-gray-100 transition-colors pr-10">
                      {sessionLink}
                    </div>
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-500" />}
                    </div>
                  </div>
                </div>
              </div>

              {/* Participant Status */}
              <div className="bg-blue-50 p-3 md:p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm md:text-base">Participants Waiting</h4>
                    <p className="text-xs md:text-sm text-blue-700">
                      {participantProgress.current} of {participantProgress.max} joined
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-sm md:text-lg px-2 md:px-3 py-1">
                    {participantProgress.current}
                  </Badge>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-2 md:mt-3">
                  <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
                  width: `${participantProgress.percentage}%`
                }} />
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
              {/* Session Title and Duration */}
              <div>
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900">
                    {sessionInfo.sessionTitle ?? (
                      <span className="inline-block h-5 w-40 bg-gray-200 rounded animate-pulse" />
                    )}
                  </h3>
                  <div className="flex items-center gap-1 text-gray-600 flex-shrink-0">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {sessionInfo.durationMinutes ? `${sessionInfo.durationMinutes} min` : 'Duration TBD'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Facilitator */}
              <div className="flex items-center gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-600">Facilitated by</p>
                  <p className="font-medium text-gray-900 text-sm md:text-base truncate">
                    {sessionInfo.facilitatorTitle ?? (
                      <span className="inline-block h-4 w-28 bg-gray-200 rounded animate-pulse" />
                    )}
                  </p>
                </div>
              </div>

              {/* Objective */}
              <div>
                <label className="text-xs md:text-sm font-medium text-gray-700">Session Objective</label>
                <p className="text-gray-900 mt-1 p-2 md:p-3 bg-gray-50 rounded-lg text-xs md:text-sm leading-relaxed">
                  {sessionInfo.objective ?? (
                    <span className="inline-block h-4 w-full bg-gray-200 rounded animate-pulse" />
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="max-w-full sm:max-w-xl px-2 py-6 md:px-8 md:py-10">
            <DialogHeader>
              <DialogTitle>Session QR Code</DialogTitle>
              <DialogDescription>
                Scan this QR code with your device to join the session instantly.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-6 w-full">
              {/* QR Code */}
              <div className="bg-white p-4 md:p-6 rounded-lg border-2 border-gray-200">
                <QRCodeSVG value={sessionLink} size={window.innerWidth < 640 ? 180 : 280} />
              </div>

              {/* Session Link and Copy Button - fixed layout */}
              <div className="flex w-full flex-col md:flex-row items-stretch gap-3">
                <div className="flex-1 p-2 md:p-3 bg-gray-50 rounded border text-xs md:text-base font-mono break-all text-gray-800 text-center md:text-left">
                  {sessionLink}
                </div>
                <Button onClick={handleCopyLink} size="sm" variant="outline" className="flex items-center gap-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-sm text-gray-600 text-center max-w-xs">
                Participants can scan this QR code or use the link to join your session.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>;
};
export default PreSessionHostView;