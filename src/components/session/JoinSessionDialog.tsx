/**
 * Join Session Dialog
 *
 * Session component for the AIfacilitator application.
 */
import React, { useEffect, useState } from 'react';
import { QrCode, Copy, X } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useConversationId } from "@/hooks/useConversationId";
import { buildJoinUrl } from '@/utils/joinUrl';

interface JoinSessionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  joinUrl: string;
  currentParticipantCount: number;
  maxParticipants: number;
  /** UUID join token from the conversations table — required for secure join URLs */
  joinToken?: string | null;
}

const JoinSessionDialog = ({
  isOpen,
  setIsOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants,
  joinToken
}: JoinSessionDialogProps) => {
  const { toast } = useToast();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const { currentConversationId } = useConversationId();
  const [internalJoinUrl, setInternalJoinUrl] = useState('');

  // Auto-close dialog when session is full
  useEffect(() => {
    if (isOpen && maxParticipants > 0 && currentParticipantCount >= maxParticipants) {
      setIsOpen(false);
    }
  }, [isOpen, currentParticipantCount, maxParticipants, setIsOpen]);

  useEffect(() => {
    // Use the provided joinUrl if available, otherwise build one from the conversation ID.
    // Always prefer the token-bearing URL when we have a token.
    const generateJoinUrl = () => {
      if (joinToken && currentConversationId) {
        // Build a fresh secure URL with the token
        setInternalJoinUrl(buildJoinUrl(currentConversationId, joinToken));
      } else if (joinUrl) {
        setInternalJoinUrl(joinUrl);
      } else if (currentConversationId) {
        setInternalJoinUrl(buildJoinUrl(currentConversationId, null));
      }
    };

    generateJoinUrl();
  }, [joinUrl, joinToken, currentConversationId]);

  useEffect(() => {
    // Generate QR code URL when the join URL is available
    if (internalJoinUrl) {
      setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(internalJoinUrl)}`);
    }
  }, [internalJoinUrl]);

  const copyJoinLink = () => {
    if (internalJoinUrl) {
      navigator.clipboard.writeText(internalJoinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
    }
  };

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    const start = url.substring(0, Math.floor(maxLength / 2) - 2);
    const end = url.substring(url.length - Math.floor(maxLength / 2) + 2);
    return `${start}...${end}`;
  };

  // Don't render the dialog trigger or dialog if session is full
  if (maxParticipants > 0 && currentParticipantCount >= maxParticipants) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="absolute top-4 right-14 z-10"
          onClick={() => setIsOpen(true)}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-md mx-auto p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle>Join Session</DialogTitle>
          <DialogDescription>
            Share this link or QR code to invite others
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-4">
          {internalJoinUrl ? (
            <>
              <div className="w-full flex justify-center bg-white p-3 rounded-lg border">
                <img 
                  src={qrCodeUrl} 
                  alt="Session QR Code" 
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                />
              </div>
              
              <div className="w-full space-y-2">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg border p-2 min-h-[40px]">
                  <span className="text-xs font-mono text-gray-700 flex-1 break-all leading-tight px-1">
                    {truncateUrl(internalJoinUrl, 50)}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="ml-2 h-8 w-8 p-0 flex-shrink-0" 
                    onClick={copyJoinLink}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500 py-4">
              No session URL available
            </div>
          )}
          <p className="text-sm text-gray-600 text-center">
            {currentParticipantCount} 
            {maxParticipants > 0 ? ` of ${maxParticipants}` : ''} participants
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSessionDialog;
