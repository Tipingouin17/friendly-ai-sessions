
import React, { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ParticipantCounter from './ParticipantCounter';
import StartSessionButton from './admin/StartSessionButton';

interface AdminQrViewProps {
  conversationId: number;
  currentParticipantCount: number;
  maxParticipants: number;
  facilitatorTitle?: string;
  onStartSession: () => void;
  onSessionFull: () => void;
}

const AdminQrView: React.FC<AdminQrViewProps> = ({
  conversationId,
  currentParticipantCount,
  maxParticipants,
  facilitatorTitle,
  onStartSession,
  onSessionFull
}) => {
  const [sessionLink, setSessionLink] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const { toast } = useToast();
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    const baseUrl = window.location.origin;
    setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
  }, [conversationId]);

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
              Participants can join using the QR code or link below
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

          {/* QR Code and Link */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Scan to Join</h3>
              <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                <QRCodeSVG 
                  value={sessionLink} 
                  size={isMobile ? 200 : 250}
                  className="mx-auto"
                />
              </div>
            </div>

            {/* Link */}
            <div className="flex flex-col items-center">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">Or Use This Link</h3>
              <div className="w-full max-w-md">
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
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions for Participants</h3>
            <div className="text-blue-800 space-y-2">
              <p>📱 <strong>Mobile users:</strong> Scan the QR code with your camera app</p>
              <p>💻 <strong>Computer users:</strong> Copy and paste the link into your browser</p>
              <p>✍️ <strong>All participants:</strong> Enter your name when prompted</p>
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
