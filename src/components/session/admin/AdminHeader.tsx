
import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversationId } from "@/hooks/useConversationId";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { 
  Share2, 
  MessageSquare, 
  QrCode, 
  Download,
  Play,
  Pause
} from "lucide-react";
import AdminActionButton from './AdminActionButton';
import AdminMessageDialog from './AdminMessageDialog';
import AdminQrDialog from './AdminQrDialog';
import ParticipantCounter from './ParticipantCounter';
import SessionStatusBadge from './SessionStatusBadge';
import { AdminHeaderProps } from './types';

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
  const location = useLocation();
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const { currentConversationId } = useConversationId();
  const [joinUrl, setJoinUrl] = useState('');
  const { setAdminStatus } = useSessionAdminStatus();
  
  // Generate join URL when component mounts or conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/join-session?id=${currentConversationId}`;
      setJoinUrl(url);
      console.log("Generated join URL:", url);
    }
  }, [currentConversationId]);
  
  // Enforce admin status on mount
  useEffect(() => {
    console.log("AdminHeader mounted - enforcing admin status");
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
  }, [setAdminStatus]);
  
  const copySessionLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      toast({
        title: "Link copied",
        description: "Session join link copied to clipboard",
      });
      
      // Mark as admin to maintain state
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  };
  
  const handleSendMessage = (message: string) => {
    if (message.trim() && onSendAdminMessage) {
      // Ensure admin status before sending
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      
      onSendAdminMessage(message);
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
    setAdminStatus(true);
    setShowQrDialog(true);
  };
  
  // Handle dialog close without losing admin state
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reaffirm admin state when closing dialog
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      
      // Check if we need to redirect back to admin page
      if (currentConversationId && !window.location.pathname.includes('/admin')) {
        console.log("Dialog closed but not on admin path - redirecting back to admin page");
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
  
  // Handler for any action button to ensure admin status is preserved
  const handleAdminAction = (callback?: () => void) => {
    // Enforce admin status
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    // Call the original callback if provided
    if (callback) callback();
  };
  
  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-16 z-10 shadow-sm">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-900">{sessionTitle}</h1>
          {facilitatorTitle && (
            <span className="text-sm text-gray-500">Facilitator: {facilitatorTitle}</span>
          )}
          <SessionStatusBadge isActive={isSessionActive} />
        </div>
        
        <div className="flex items-center gap-2">
          <ParticipantCounter 
            currentParticipants={currentParticipants}
            maxParticipants={maxParticipants}
          />
          
          <AdminActionButton
            icon={<MessageSquare size={16} />}
            label="Send Message"
            onClick={() => handleAdminAction(() => setShowMessageDialog(true))}
          />
          
          <AdminActionButton
            icon={isSessionActive ? <Pause size={16} /> : <Play size={16} />}
            label={isSessionActive ? "Pause" : "Resume"}
            onClick={() => handleAdminAction(onToggleSessionState)}
          />
          
          <AdminActionButton
            icon={<QrCode size={16} />}
            label="QR Code"
            onClick={() => handleAdminAction(handleShowQrDialog)}
          />
          
          <AdminActionButton
            icon={<Share2 size={16} />}
            label="Share"
            onClick={() => handleAdminAction(copySessionLink)}
          />
          
          <AdminActionButton
            icon={<Download size={16} />}
            label="Export"
            onClick={() => handleAdminAction(onExportData)}
          />
        </div>
      </div>
      
      <AdminQrDialog
        isOpen={showQrDialog}
        onOpenChange={handleDialogClose}
        joinUrl={joinUrl}
        currentParticipants={currentParticipants}
        maxParticipants={maxParticipants}
        onCopyLink={() => handleAdminAction(copySessionLink)}
      />
      
      <AdminMessageDialog
        isOpen={showMessageDialog}
        onOpenChange={(open) => {
          if (!open) {
            handleAdminAction();
          }
          setShowMessageDialog(open);
        }}
        onSendMessage={handleSendMessage}
      />
    </header>
  );
};

export default AdminHeader;
