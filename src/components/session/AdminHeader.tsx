import React, { useState, useEffect } from 'react';
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
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { useConversationId } from "@/hooks/useConversationId";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";

interface AdminHeaderProps {
  sessionTitle: string;
  facilitatorTitle: string;
  currentParticipants?: number;
  maxParticipants?: number;
  isSessionActive?: boolean;
  onToggleSessionState?: () => void;
  onSendAdminMessage?: (message: string) => void;
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
  const navigate = useNavigate();
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const { currentConversationId } = useConversationId();
  const [joinUrl, setJoinUrl] = useState('');
  
  // Generate join URL when component mounts or conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/join-session?id=${currentConversationId}`;
      setJoinUrl(url);
      console.log("Generated join URL:", url);
    }
  }, [currentConversationId]);
  
  const copySessionLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
      
      // Mark as admin to maintain state
      sessionStorage.setItem('isAdminSession', 'true');
    }
  };
  
  const handleSendMessage = () => {
    if (adminMessage.trim() && onSendAdminMessage) {
      onSendAdminMessage(adminMessage);
      setAdminMessage('');
      setShowMessageDialog(false);
      toast({
        title: "Message sent",
        description: "Your message has been sent to all participants",
      });
    }
  };
  
  // Show QR code dialog without losing admin state
  const handleShowQrDialog = () => {
    // Ensure admin state is preserved
    sessionStorage.setItem('isAdminSession', 'true');
    setShowQrDialog(true);
  };
  
  // Handle dialog close without losing admin state
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reaffirm admin state when closing dialog
      sessionStorage.setItem('isAdminSession', 'true');
      
      // Check if we need to redirect back to admin page
      if (currentConversationId && !window.location.pathname.includes('/admin')) {
        navigate(`/session/admin?id=${currentConversationId}`, { 
          state: { 
            isAdmin: true,
            showMessaging: true,
            conversationId: currentConversationId
          },
          replace: true
        });
      }
    }
    setShowQrDialog(open);
  };
  
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-16 z-10 shadow-sm">
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
            onClick={() => {
              sessionStorage.setItem('isAdminSession', 'true');
              setShowMessageDialog(true);
            }}
          >
            <MessageSquare size={16} />
            <span>Send Message</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2"
            onClick={() => {
              sessionStorage.setItem('isAdminSession', 'true');
              if (onToggleSessionState) onToggleSessionState();
            }}
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
            onClick={handleShowQrDialog}
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
            onClick={() => {
              sessionStorage.setItem('isAdminSession', 'true');
              if (onExportData) onExportData();
            }}
          >
            <Download size={16} />
            <span>Export</span>
          </Button>
        </div>
      </div>
      
      <Dialog open={showQrDialog} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Session QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6">
            {joinUrl && (
              <>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} 
                    alt="Session QR Code" 
                    className="w-48 h-48"
                  />
                </div>
                <div className="flex w-full items-center mt-2 bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                  <input 
                    type="text" 
                    value={joinUrl} 
                    readOnly 
                    className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:outline-none"
                  />
                  <Button 
                    variant="ghost" 
                    className="h-full rounded-l-none border-l" 
                    onClick={copySessionLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p className="font-medium">Current participants: {currentParticipants}/{maxParticipants}</p>
              <p className="mt-1">Share this QR code or link with participants to join the session</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog 
        open={showMessageDialog} 
        onOpenChange={(open) => {
          if (!open) {
            sessionStorage.setItem('isAdminSession', 'true');
          }
          setShowMessageDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message to Participants</DialogTitle>
            <DialogDescription>
              This message will appear as a notification for all participants.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4">
            <Textarea
              placeholder="Type your message here..."
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                sessionStorage.setItem('isAdminSession', 'true');
                setShowMessageDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={!adminMessage.trim()}>
              Send Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default AdminHeader;
