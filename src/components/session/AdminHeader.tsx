
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Share2, 
  Users, 
  QrCode, 
  Copy, 
  MessageSquare, 
  Download,
  Play,
  Pause
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';

interface AdminHeaderProps {
  sessionTitle: string;
  facilitatorTitle: string;
  currentParticipants?: number;
  maxParticipants?: number;
  isSessionActive?: boolean;
  onToggleSessionState?: () => void;
  onSendAdminMessage?: () => void;
  onExportData?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  sessionTitle, 
  facilitatorTitle,
  currentParticipants = 0,
  maxParticipants = 0,
  isSessionActive = true,
  onToggleSessionState,
  onSendAdminMessage,
  onExportData
}) => {
  const { toast } = useToast();
  const [showQrDialog, setShowQrDialog] = useState(false);
  
  // Generate join URL
  const sessionId = new URLSearchParams(window.location.search).get('id');
  const baseUrl = window.location.origin;
  const joinUrl = sessionId ? `${baseUrl}/join-session?id=${sessionId}` : '';
  
  const copySessionLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-16 z-10 shadow-sm"> {/* Changed top-0 to top-16 to position below navbar */}
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">{sessionTitle}</h1>
          {facilitatorTitle && (
            <span className="text-sm text-gray-500">Facilitator: {facilitatorTitle}</span>
          )}
          <Badge 
            variant={isSessionActive ? "default" : "secondary"}
            className={`ml-2 ${isSessionActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}
          >
            {isSessionActive ? "Active" : "Paused"}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center mr-4 bg-gray-50 px-3 py-1 rounded-full">
            <Users size={16} className="text-gray-500 mr-1" />
            <span className="text-sm font-medium">
              {currentParticipants}/{maxParticipants}
            </span>
          </div>
          
          <Button
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={onSendAdminMessage}
          >
            <MessageSquare size={16} />
            <span>Send Message</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={onToggleSessionState}
          >
            {isSessionActive ? (
              <>
                <Pause size={16} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Resume</span>
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => setShowQrDialog(true)}
          >
            <QrCode size={16} />
            <span>QR Code</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={copySessionLink}
          >
            <Share2 size={16} />
            <span>Share</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={onExportData}
          >
            <Download size={16} />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            {joinUrl && (
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} 
                alt="Session QR Code" 
                className="mb-4 border border-gray-200 rounded-md"
              />
            )}
            <div className="flex w-full mt-4">
              <input 
                type="text" 
                value={joinUrl} 
                readOnly 
                className="flex-1 rounded-l-md border border-r-0 border-gray-300 px-3 py-2 text-sm"
              />
              <Button 
                variant="outline" 
                className="rounded-l-none border border-l-0" 
                onClick={copySessionLink}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 text-sm text-gray-500 text-center">
              <p>Current participants: {currentParticipants}/{maxParticipants}</p>
              <p className="mt-1">Share this QR code or link with participants to join the session</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default AdminHeader;
