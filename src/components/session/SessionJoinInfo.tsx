
import React, { useEffect, useState } from 'react';
import { QrCode, Link, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SessionJoinInfoProps {
  conversationId: number | null;
}

const SessionJoinInfo = ({ conversationId }: SessionJoinInfoProps) => {
  const [copied, setCopied] = useState(false);
  const [sessionLink, setSessionLink] = useState('');
  
  useEffect(() => {
    // Create the session join link
    if (conversationId) {
      const baseUrl = window.location.origin;
      setSessionLink(`${baseUrl}/join-session?id=${conversationId}`);
    }
  }, [conversationId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!conversationId) return null;

  return (
    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center gap-1 text-gray-700">
          <QrCode className="w-4 h-4" /> Join this session
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2"
                onClick={handleCopyLink}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy join link</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="flex flex-col items-center space-y-2">
        {/* QR Code - using a simple QR code API */}
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(sessionLink)}`}
          alt="Session QR Code"
          className="rounded-md border border-gray-200 bg-white p-1"
          width={120}
          height={120}
        />
        
        <div className="w-full flex items-center gap-1 bg-gray-50 p-2 rounded text-xs text-gray-700 border border-gray-200">
          <Link className="w-3 h-3 text-gray-500 flex-shrink-0" />
          <span className="truncate">{sessionLink}</span>
        </div>
      </div>
    </div>
  );
};

export default SessionJoinInfo;
