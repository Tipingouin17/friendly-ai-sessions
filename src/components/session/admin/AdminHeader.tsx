import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, LayoutDashboard } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
import AdminMessageDialog from "./AdminMessageDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { useSessionClosure } from "@/hooks/useSessionClosure";
import SessionClosureDialog from "../SessionClosureDialog";
import ReportDownloadDialog from "../ReportDownloadDialog";

interface AdminHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  handleAdminMessage: (message: string) => void;
  onExportData?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
  handleAdminMessage,
  onExportData
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
    // Navigate to past workshops page with auto=true to automatically navigate to the latest active session
    navigate('/past-workshops?auto=true');
  };

  const handleCloseSession = async () => {
    if (!conversation?.id) return;
    
    const success = await closeSessionAndGenerateReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
      setShowReportDialog(true);
    }
  };

  const handleExportClick = () => {
    if (onExportData) {
      // If there's a custom export handler, use it
      onExportData();
    } else {
      // Otherwise, show the session closure dialog
      setShowClosureDialog(true);
    }
  };

  // Get session title
  const getSessionTitle = () => {
    if (!conversation) return "Loading...";
    return conversation.sessions?.title || "Untitled Session";
  };

  return (
    <>
      <div className="flex flex-col w-full sticky top-0 z-10 bg-white border-b pb-2">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={handleBack} title="Back to Sessions Dashboard">
              <LayoutDashboard className="h-5 w-5" />
            </Button>
            
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">{getSessionTitle()}</h1>
              <div className="flex items-center mt-1">
                <SessionStatusBadge
                  isActive={!isSessionPaused}
                  sessionStarted={conversation?.session_started || false}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1"
              onClick={handleExportClick}
              disabled={isClosing || conversation?.is_session_ended}
            >
              <FileText className="h-4 w-4" />
              <span>
                {isClosing ? 'Closing...' : 'Close & Get Report'}
              </span>
            </Button>
            <SessionsDropdown 
              currentSessionId={conversation?.id || null}
              activeSessions={activeSessions}
              isLoading={isLoading}
              onRefresh={refreshSessions}
            />
            <AdminMessageDialog onSendMessage={handleAdminMessage} />
            <AdminQrDialog conversationId={conversation?.id || null} />
          </div>
        </div>
      </div>

      {/* Session Closure Confirmation Dialog */}
      <SessionClosureDialog
        isOpen={showClosureDialog}
        onClose={() => setShowClosureDialog(false)}
        onConfirm={handleCloseSession}
        isClosing={isClosing}
        participantCount={conversation?.current_participants || 0}
        sessionTitle={getSessionTitle()}
      />

      {/* Report Download Dialog */}
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

export default AdminHeader;
