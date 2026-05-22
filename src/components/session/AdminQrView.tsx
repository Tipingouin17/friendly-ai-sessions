/**
 * Admin Qr View
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle, Headphones, Mic, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ParticipantCounter from './ParticipantCounter';
import StartSessionButton from './admin/StartSessionButton';
import { buildJoinUrl } from '@/utils/joinUrl';

interface AdminQrViewProps {
  conversationId: number;
  currentParticipantCount: number;
  maxParticipants: number;
  facilitatorTitle?: string;
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const AdminQrView: React.FC<AdminQrViewProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  joinToken,
  onStartSession,
  onSessionFull
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const { toast } = useToast();
  const isMobile = window.innerWidth < 768;

  // Compute the join URL synchronously — no useEffect needed.
  // When joinToken is not yet loaded, sessionLink will be the base URL without
  // the token; we hide the QR / link until the token is available to avoid
  // showing an insecure URL that then gets replaced (visible flash).
  const sessionLink = buildJoinUrl(conversationId, joinToken);
  const isLinkReady = Boolean(joinToken);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(sessionLink)
      .then(() => {
        setShowCopied(true);
        toast({
          title: "Link Copied",
          description: "The session link has been copied to your clipboard.",
        });
        setTimeout(() => setShowCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link: ", err);
        toast({
          title: "Copy Failed",
          description: "Could not copy the session link to your clipboard.",
          variant: "destructive",
        });
      });
  }, [sessionLink, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Session Ready to Start
            </h1>
            <p className="text-lg text-gray-600">
              {facilitatorTitle && (
                <span className="block mb-2">Facilitated by {facilitatorTitle}</span>
              )}
              Participants can join the voice-first AI workshop using the QR code or link below
            </p>
          </div>

          {/* Participant Counter */}
          <div className="mb-8">
            <ParticipantCounter
              currentParticipants={currentParticipantCount}
              maxParticipants={maxParticipants}
              conversationId={conversationId}
            />
          </div>

          {/* QR Code and Link — only shown once the secure token is available */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Scan to Join</h3>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                {isLinkReady ? (
                  <QRCodeSVG 
                    value={sessionLink} 
                    size={isMobile ? 200 : 250}
                    className="mx-auto"
                  />
                ) : (
                  <div
                    className="animate-pulse bg-gray-200 rounded"
                    style={{ width: isMobile ? 200 : 250, height: isMobile ? 200 : 250 }}
                  />
                )}
              </div>
            </div>

            {/* Link */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Or Use This Link</h3>
              <div className="w-full max-w-md">
                {isLinkReady ? (
                  <>
                    <div className="flex items-center bg-gray-50 rounded-lg p-3 border">
                      <input
                        type="text"
                        value={sessionLink}
                        readOnly
                        className="flex-1 bg-transparent text-sm text-gray-700 border-none outline-none"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyToClipboard}
                        className="ml-2 text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {showCopied && (
                      <p className="text-sm text-green-600 mt-2 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Link copied!
                      </p>
                    )}
                  </>
                ) : (
                  <div className="animate-pulse space-y-2">
                    <div className="h-10 bg-gray-200 rounded-lg" />
                    <p className="text-xs text-gray-400 text-center">Generating secure link…</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions for Participants</h3>
            <div className="grid gap-3 text-left text-blue-800 md:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3">
                <Mic className="mb-1 h-4 w-4 text-blue-600" />
                <strong>Speak first:</strong> participants can use the microphone where supported, then review the transcript before sending.
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <Headphones className="mb-1 h-4 w-4 text-blue-600" />
                <strong>Listen:</strong> use Read aloud on facilitator messages for a spoken AI moderator experience.
              </div>
              <div className="rounded-xl bg-white/80 p-3">
                <Video className="mb-1 h-4 w-4 text-blue-600" />
                <strong>Want cameras?</strong> keep Teams, Zoom, or Meet open alongside this workshop room.
              </div>
            </div>
          </div>

          {/* Start Session Button */}
          <div className="flex flex-col items-center gap-4">
            <StartSessionButton
              conversationId={conversationId}
              participants={[]} // Will be populated with actual participants
              conversationData={null} // Will be populated with actual conversation data
              onSessionStarted={onStartSession}
              disabled={currentParticipantCount === 0}
            />
            
            {currentParticipantCount === 0 && (
              <p className="text-sm text-gray-500">
                Waiting for participants to join before starting the session
              </p>
            )}
            
            {currentParticipantCount > 0 && (
              <p className="text-sm text-gray-600">
                {currentParticipantCount} participant{currentParticipantCount !== 1 ? 's' : ''} ready to start
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQrView;
