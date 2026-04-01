
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, BarChart3, Lock } from "lucide-react";
import HostQrDialog from "./HostQrDialog";
import SessionStatusBadge from "./SessionStatusBadge";
import SessionAnalyticsDashboard from "./SessionAnalyticsDashboard";
import HostWrapUpDialog from "./HostWrapUpDialog";
import { ConversationWithSession } from "@/types/database";
import SessionsDropdown from "./SessionsDropdown";
import { useHostSessions } from "@/hooks/useHostSessions";
import { useSessionClosure } from "@/hooks/useSessionClosure";
import SessionClosureDialog from "../SessionClosureDialog";
import ReportDownloadDialog from "../ReportDownloadDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/components/ui/use-toast";

interface HostHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
}

const HostHeader: React.FC<HostHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeSessions, isLoading, refreshSessions } = useHostSessions();
  const { 
    isClosing, 
    closureResult, 
    closeSessionAndGenerateReport, 
    downloadReport 
  } = useSessionClosure();
  const { canGenerateReports } = usePlanLimits();
  
  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  
  const handleBack = () => {
    try {
      navigate('/past-workshops', { replace: true });
    } catch (error) {
      console.error("Navigation error:", error);
      // Fallback navigation
      window.location.href = '/past-workshops';
    }
  };

  const handleCloseSession = async () => {
    if (!conversation?.id) {
      console.error("No conversation ID available for closing session");
      return;
    }
    
    const success = await closeSessionAndGenerateReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
      if (canGenerateReports) {
        setShowReportDialog(true);
      } else {
        toast({
          title: "Session Closed",
          description: "Your session has been closed. Upgrade your plan to access session reports.",
          variant: "default",
        });
      }
    }
  };

  const handleCloseAndGetReport = () => {
    if (!conversation?.id) {
      console.error("No conversation available for closure");
      return;
    }

    if (conversation.is_session_ended) {
      return;
    }

    if (!canGenerateReports) {
      toast({
        title: "Reports Locked",
        description: "Session reports are not available on your current plan. Upgrade to access this feature.",
        variant: "destructive",
      });
      navigate('/pricing');
      return;
    }

    setShowClosureDialog(true);
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
  const isSessionStarted = conversation?.session_started || false;
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
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="Back to Dashboard"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-gray-900">{getSessionTitle()}</h1>
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded && isSessionStarted}
                  sessionStarted={isSessionStarted}
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

        {/* Action Buttons Row - Aligned to the right in specified order */}
        <div className="flex items-center justify-end px-6 pb-4">
          <div className="flex items-center gap-3">
            {/* QR Code Button */}
            {!isSessionEnded && (
              <HostQrDialog conversationId={conversation?.id || null} />
            )}

            {/* Analytics Button */}
            {conversation?.id && (
              <Button
                variant={analyticsOpen ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
                onClick={() => setAnalyticsOpen(prev => !prev)}
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
            )}

            {/* Wrap Up Button - only show if session has started */}
            {!isSessionEnded && isSessionStarted && (
              <HostWrapUpDialog
                onWrapUp={toggleSessionState}
                isWrappingUp={isSessionPaused}
              />
            )}

            {/* Close & Get Report Button - gated by session_reports plan restriction */}
            {!canGenerateReports ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="flex items-center gap-2 min-w-0 opacity-60 cursor-not-allowed"
                      onClick={handleCloseAndGetReport}
                      disabled={isClosing}
                    >
                      <Lock className="h-4 w-4" />
                      <span className="whitespace-nowrap">Reports (Upgrade)</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Session reports are not available on your current plan. Upgrade to access this feature.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button 
                variant={isSessionEnded ? "outline" : "default"}
                size="sm" 
                className="flex items-center gap-2 min-w-0"
                onClick={handleCloseAndGetReport}
                disabled={isClosing}
              >
                <FileText className="h-4 w-4" />
                <span className="whitespace-nowrap">
                  {isClosing ? 'Closing...' : isSessionEnded ? 'Session Ended' : 'Close & Get Report'}
                </span>
              </Button>
            )}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {conversation?.id && analyticsOpen && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 rounded-lg p-4 border">
              <SessionAnalyticsDashboard
                conversationId={conversation.id}
                className="bg-white rounded-md"
              />
            </div>
          </div>
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

export default HostHeader;
