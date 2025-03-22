import React, { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { useNavigate, useLocation } from "react-router-dom";
import { useConversationId } from "@/hooks/useConversationId";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";
import { 
  MessageSquare, 
  Pause,
  Play,
  QrCode,
  Share2,
  Download,
  Info,
  Users
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AdminMessageDialog from './AdminMessageDialog';
import AdminQrDialog from './AdminQrDialog';
import { AdminHeaderProps } from './types';

const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  sessionTitle, 
  facilitatorTitle,
  currentParticipants = 0,
  maxParticipants = 0,
  isSessionActive = true,
  onToggleSessionState,
  onSendAdminMessage,
  onExportData,
  sessionState
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const { currentConversationId } = useConversationId();
  const [joinUrl, setJoinUrl] = useState('');
  const { setAdminStatus } = useSessionAdminStatus();
  
  // Get session details
  const sessionObjective = sessionState?.objective || '';
  const sessionLanguage = sessionState?.language || 'English';
  
  // Generate join URL when component mounts or conversation ID changes
  useEffect(() => {
    if (currentConversationId) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/join-session?id=${currentConversationId}`;
      setJoinUrl(url);
    }
  }, [currentConversationId]);
  
  // Enforce admin status on mount
  useEffect(() => {
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
      
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
    }
  };
  
  const handleSendMessage = (message: string) => {
    if (message.trim() && onSendAdminMessage) {
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
  
  const handleShowQrDialog = () => {
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    setShowQrDialog(true);
  };
  
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      sessionStorage.setItem('isAdminSession', 'true');
      setAdminStatus(true);
      
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
  
  const handleAdminAction = (callback?: () => void) => {
    sessionStorage.setItem('isAdminSession', 'true');
    setAdminStatus(true);
    
    if (callback) callback();
  };

  const toggleSessionDetails = () => {
    setShowSessionDetails(!showSessionDetails);
  };
  
  const isSessionFull = maxParticipants > 0 && currentParticipants >= maxParticipants;

  return (
    <header className="bg-white border-b border-gray-200 py-4 px-6 sticky top-0 z-10">
      <div className="container mx-auto">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-semibold text-gray-900">{sessionTitle || "Session Admin Panel"}</h1>
              <div className={`px-3 py-1 text-sm font-medium rounded-full ${isSessionActive ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {isSessionActive ? 'Active' : 'Paused'}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={toggleSessionDetails}
                      className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <Info size={18} className="text-gray-500" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showSessionDetails ? "Hide session details" : "Show session details"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleAdminAction(() => setShowMessageDialog(true))}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <MessageSquare size={18} />
                Send Message
              </button>
              
              <button 
                onClick={() => handleAdminAction(onToggleSessionState)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {isSessionActive ? <Pause size={18} /> : <Play size={18} />}
                {isSessionActive ? "Pause" : "Resume"}
              </button>
              
              {/* Only show QR Code button if session is not full */}
              {!isSessionFull && (
                <button 
                  onClick={() => handleAdminAction(handleShowQrDialog)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <QrCode size={18} />
                  QR Code
                </button>
              )}
              
              <button 
                onClick={() => handleAdminAction(copySessionLink)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Share2 size={18} />
                Share
              </button>
              
              <button 
                onClick={() => handleAdminAction(onExportData)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 space-x-6">
            <div className="flex items-center gap-1">
              <Users size={16} className="text-gray-400" />
              <span>{currentParticipants}/{maxParticipants}</span>
            </div>
            
            <div>
              Language: {sessionLanguage}
            </div>
            
            {facilitatorTitle && (
              <div>
                Facilitator: {facilitatorTitle}
              </div>
            )}
          </div>
          
          {showSessionDetails && sessionObjective && (
            <div className="mt-1 text-sm text-gray-600 max-w-3xl">
              <span className="font-medium">Objective:</span> {sessionObjective}
            </div>
          )}
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
