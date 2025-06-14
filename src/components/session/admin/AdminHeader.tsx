
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, BarChart3 } from "lucide-react";
import AdminQrDialog from "./AdminQrDialog";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AdminHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
  onExportData?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
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

  const getFacilitatorInfo = () => {
    if (!conversation?.sessions?.facilitator_details) return null;
    return conversation.sessions.facilitator_details;
  };

  const isSessionEnded = conversation?.is_session_ended || false;
  const facilitatorInfo = getFacilitatorInfo();

  return (
    <>
      <div className="flex flex-col w-full sticky top-0 z-10 bg-white border-b shadow-sm">
        {/* Main Header Row - Navigation, Title & Session Switcher */}
        <div className="flex items-center justify-between p-6 pb-4">
          {/* Left Section - Navigation & Title */}
          <div className="flex items-center space-x-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBack} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              title="Back to Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{getSessionTitle()}</h1>
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded}
                  sessionStarted={conversation?.session_started || false}
                />
              </div>
              
              {facilitatorInfo && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Facilitated by</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {facilitatorInfo.title}
                  </Badge>
                  {facilitatorInfo.details && (
                    <span className="text-xs text-gray-500 max-w-xs truncate">
                      {facilitatorInfo.details}
                    </span>
                  )}
                </div>
              )}
              
              {isSessionEnded && (
                <Badge variant="destructive" className="w-fit">
                  Session Ended
                </Badge>
              )}
            </div>
          </div>

          {/* Right Section - Session Switcher (only if multiple sessions) */}
          <div className="flex items-center gap-3">
            {activeSessions.length > 1 && (
              <SessionsDropdown 
                currentSessionId={conversation?.id || null}
                activeSessions={activeSessions}
                isLoading={isLoading}
                onRefresh={refreshSessions}
              />
            )}
          </div>
        </div>

        {/* Action Buttons Row - Below Description */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center gap-3">
            {/* Analytics Group */}
            {conversation?.id && (
              <div className="flex items-center gap-2">
                <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      <span className="hidden sm:inline">Analytics</span>
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              </div>
            )}

            <Separator orientation="vertical" className="h-6" />

            {/* Session Controls Group */}
            <div className="flex items-center gap-2">
              {!isSessionEnded && (
                <AdminWrapUpDialog
                  onWrapUp={toggleSessionState}
                  isWrappingUp={isSessionPaused}
                />
              )}
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Communication Group */}
            {!isSessionEnded && (
              <div className="flex items-center gap-2">
                <AdminQrDialog conversationId={conversation?.id || null} />
              </div>
            )}
          </div>

          {/* Primary Action */}
          <Button 
            variant={isSessionEnded ? "outline" : "default"}
            size="sm" 
            className="flex items-center gap-2 min-w-0"
            onClick={handleExportClick}
            disabled={isClosing}
          >
            <FileText className="h-4 w-4" />
            <span className="whitespace-nowrap">
              {isClosing ? 'Closing...' : isSessionEnded ? 'Session Ended' : 'Close & Get Report'}
            </span>
          </Button>
        </div>

        {/* Analytics Dashboard */}
        {conversation?.id && (
          <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
            <CollapsibleContent className="px-6 pb-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <SessionAnalyticsDashboard
                  conversationId={conversation.id}
                  className="bg-white rounded-md"
                />
              </div>
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
