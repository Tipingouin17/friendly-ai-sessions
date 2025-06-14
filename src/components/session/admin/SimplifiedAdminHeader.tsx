
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, LayoutDashboard, Users, MessageSquare, Clock, BarChart2 } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
import AdminMessageDialog from "./AdminMessageDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { useSessionClosure } from "@/hooks/useSessionClosure";
import SessionClosureDialog from "../SessionClosureDialog";
import ReportDownloadDialog from "../ReportDownloadDialog";
import { Card, CardContent } from "@/components/ui/card";

interface SimplifiedAdminHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  handleAdminMessage: (message: string) => void;
  onExportData?: () => void;
  currentParticipantCount: number;
  maxParticipants: number;
  totalMessages: number;
}

const SimplifiedAdminHeader: React.FC<SimplifiedAdminHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  handleAdminMessage,
  onExportData,
  currentParticipantCount,
  maxParticipants,
  totalMessages
}) => {
  const navigate = useNavigate();
  const { activeSessions, isLoading, refreshSessions } = useAdminSessions();
  const { 
    isClosing, 
    closureResult, 
    closeSessionAndGenerateReport, 
    downloadReport 
  } = useSessionClosure();
  
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  
  const handleBack = () => {
    navigate('/past-workshops?auto=true');
  };

  const handleCloseSession = async () => {
    if (!conversation?.id) {
      console.error("No conversation ID available for closing session");
      return;
    }
    
    const success = await closeSessionAndGenerateReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
      setShowReportDialog(true);
    }
  };

  const handleExportClick = () => {
    if (!conversation?.id) {
      console.error("No conversation available for export");
      return;
    }

    if (conversation.is_session_ended) {
      return;
    }

    if (onExportData) {
      onExportData();
    } else {
      setShowClosureDialog(true);
    }
  };

  const getSessionTitle = () => {
    if (!conversation) return "Loading...";
    return conversation.sessions?.title || "Untitled Session";
  };

  const isSessionEnded = conversation?.is_session_ended || false;
  
  // Calculate session duration
  const sessionStartTime = conversation?.created_at 
    ? new Date(conversation.created_at) 
    : new Date();
  const sessionDurationMinutes = Math.round(
    (new Date().getTime() - sessionStartTime.getTime()) / (1000 * 60)
  );

  return (
    <>
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        {/* Main header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to Sessions Dashboard">
              <LayoutDashboard className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{getSessionTitle()}</h1>
              <div className="flex items-center mt-1">
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded}
                  sessionStarted={conversation?.session_started || false}
                />
                {isSessionEnded && (
                  <span className="ml-2 text-sm text-gray-500">Session Ended</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleExportClick}
              disabled={isClosing || isSessionEnded}
            >
              <FileText className="h-4 w-4" />
              <span>
                {isClosing ? 'Closing...' : isSessionEnded ? 'Session Ended' : 'Close & Get Report'}
              </span>
            </Button>
            
            {!isSessionEnded && (
              <>
                <SessionsDropdown 
                  currentSessionId={conversation?.id || null}
                  activeSessions={activeSessions}
                  isLoading={isLoading}
                  onRefresh={refreshSessions}
                />
                <AdminMessageDialog onSendMessage={handleAdminMessage} />
                <AdminQrDialog conversationId={conversation?.id || null} />
              </>
            )}
          </div>
        </div>

        {/* Simplified metrics bar */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{currentParticipantCount}/{maxParticipants}</span>
                <span className="text-xs text-gray-500">participants</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{totalMessages}</span>
                <span className="text-xs text-gray-500">messages</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">{sessionDurationMinutes}</span>
                <span className="text-xs text-gray-500">minutes</span>
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Session ID: {conversation?.id || 'Loading...'}
            </div>
          </div>
        </div>
      </div>

      <SessionClosureDialog
        isOpen={showClosureDialog}
        onClose={() => setShowClosureDialog(false)}
        onConfirm={handleCloseSession}
        isClosing={isClosing}
        participantCount={conversation?.current_participants || 0}
        sessionTitle={getSessionTitle()}
      />

      <ReportDownloadDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onDownload={(format) => {
          downloadReport(format);
          setShowReportDialog(false);
        }}
        sessionData={closureResult?.sessionData || {
          participantCount: 0,
          messageCount: 0,
          duration: 0,
          engagementScore: 0
        }}
        sessionTitle={getSessionTitle()}
      />
    </>
  );
};

export default SimplifiedAdminHeader;
