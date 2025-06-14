
import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Copy, CheckCircle, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StartSessionButton from '../admin/StartSessionButton';

interface AdminMessageEmptyStateProps {
  conversationData: any;
  conversationId?: number | null;
  participants?: any[];
  onSessionStarted?: () => void;
}

const AdminMessageEmptyState: React.FC<AdminMessageEmptyStateProps> = ({ 
  conversationData, 
  conversationId,
  participants = [],
  onSessionStarted = () => {}
}) => {
  const [sessionLink, setSessionLink] = useState('');
  const [showCopied, setShowCopied] = useState(false);
  const { toast } = useToast();
  const isMobile = window.innerWidth < 768;

  // Generate session link
  useEffect(() => {
    if (conversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
    }
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

  // Check if session has started
  const sessionStarted = conversationData?.session_started;
  const currentParticipants = conversationData?.current_participants || 0;
  const maxParticipants = conversationData?.participants || 0;

  // If session hasn't started, show the Start Session UI
  if (!sessionStarted && conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Session Ready to Start
              </h1>
              <p className="text-lg text-gray-600">
                {conversationData?.sessions?.facilitator_details?.title && (
                  <span className="block mb-2">Facilitated by {conversationData.sessions.facilitator_details.title}</span>
                )}
                Participants can join using the QR code or link below
              </p>
            </div>

            {/* Participant Counter */}
            <div className="mb-8">
              <div className="flex items-center justify-center bg-gray-50 px-4 py-2 rounded-full inline-flex">
                <Users size={20} className="text-gray-500 mr-2" />
                <span className="text-lg font-medium">
                  {currentParticipants}/{maxParticipants} participants
                </span>
              </div>
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
                participants={participants}
                conversationData={conversationData}
                onSessionStarted={onSessionStarted}
                disabled={currentParticipants === 0}
              />
              
              {currentParticipants === 0 && (
                <p className="text-sm text-gray-500">
                  Waiting for participants to join before starting the session
                </p>
              )}
              
              {currentParticipants > 0 && (
                <p className="text-sm text-gray-600">
                  {currentParticipants} participant{currentParticipants !== 1 ? 's' : ''} ready to start
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default empty state for when session has started but no messages
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <MessageSquare className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="mb-3 text-xl font-medium text-gray-800">No messages yet</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          The session has started. Messages will appear here as participants engage.
        </p>
      </div>
    </div>
  );
};

export default AdminMessageEmptyState;
