
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, LayoutDashboard, BarChart3 } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
import AdminMessageDialog from "./AdminMessageDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import SessionAnalyticsDashboard from "./SessionAnalyticsDashboard";
import AdminWrapUpDialog from "./AdminWrapUpDialog";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useAdminSessions } from "@/hooks/useAdminSessions";
import { useSessionClosure } from "@/hooks/useSessionClosure";
import SessionClosureDialog from "../SessionClosureDialog";
import ReportDownloadDialog from "../ReportDownloadDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const handleBack = () => {
    navigate('/past-workshops?auto=true');
  };

  const handleCloseSession = async () => {
    if (!conversation?.id) {
      console.error("No conversation ID available for closing session");
      return;
    }
    
    console.log("Attempting to close session with ID:", conversation.id);
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
      console.log("Session already ended, cannot close again");
      return;
    }

    if (onExportData) {
      onExportData();
    } else {
      console.log("Opening session closure dialog");
      setShowClosureDialog(true);
    }
  };

  const getSessionTitle = () => {
    if (!conversation) return "Loading...";
    return conversation.sessions?.title || "Untitled Session";
  };

  const isSessionEnded = conversation?.is_session_ended || false;

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
            {/* Analytics Toggle */}
            {conversation?.id && (
              <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            )}

            {/* Wrap Up Button */}
            {!isSessionEnded && (
              <AdminWrapUpDialog
                onWrapUp={toggleSessionState}
                isWrappingUp={isSessionPaused}
              />
            )}
            
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

        {/* Analytics Dashboard */}
        {conversation?.id && (
          <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <CollapsibleContent className="px-4 pb-4">
              <SessionAnalyticsDashboard
                conversationId={conversation.id}
                className="border rounded-lg"
              />
            </CollapsibleContent>
          </Collapsible>
        )}
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

export default AdminHeader;
