/**
 * Host Header — Redesigned
 *
 * Compact single-row command bar: session identity on the left,
 * action controls on the right. Clean slate background with a
 * subtle bottom border — no visual noise.
 */

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, BarChart3, Lock, ChevronLeft, Square } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/components/ui/use-toast";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import SessionTimerBadge from "../SessionTimerBadge";

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
    isStopping,
    closureProgress,
    closureResult,
    closeSessionAndGenerateReport,
    stopSessionWithoutReport,
    downloadReport
  } = useSessionClosure();
  const { canGenerateReports } = usePlanLimits();

  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const timer = useSessionTimer(conversation, true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const handleBack = () => {
    try {
      navigate('/past-workshops', { replace: true });
    } catch (error) {
      window.location.href = '/past-workshops';
    }
  };

  /** Host chose "Stop Session" — end without report */
  const handleStop = async () => {
    if (!conversation?.id) return;
    const success = await stopSessionWithoutReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
    }
  };

  /** Host chose "Close & Report" — end and generate AI report */
  const handleCloseAndReport = async () => {
    if (!conversation?.id) return;
    const success = await closeSessionAndGenerateReport(conversation.id);
    if (success) {
      setShowClosureDialog(false);
      if (canGenerateReports) {
        setShowReportDialog(true);
      }
    }
  };

  /** Opens the unified end-session dialog */
  const handleOpenEndDialog = () => {
    if (!conversation?.id || conversation.is_session_ended) return;
    setShowClosureDialog(true);
  };

  const getSessionTitle = () => {
    if (!conversation) return "Loading…";
    return conversation.sessions?.title || "Untitled Session";
  };

  const facilitatorInfo = conversation?.sessions?.facilitator_details ?? null;
  const isSessionEnded = conversation?.is_session_ended || false;
  const isSessionStarted = conversation?.session_started || false;
  const isBusy = isClosing || isStopping;

  return (
    <>
      {/* ── Main header bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 sm:px-5 h-14">

          {/* Back */}
          <button
            onClick={handleBack}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors shrink-0"
            title="Back to Dashboard"
          >
            <ChevronLeft className="h-4 w-4" />
            <LayoutDashboard className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Session identity */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-semibold text-slate-900 truncate max-w-[160px] sm:max-w-xs md:max-w-sm lg:max-w-none leading-tight">
                  {getSessionTitle()}
                </h1>
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded && isSessionStarted}
                  sessionStarted={isSessionStarted}
                />
                {isSessionStarted && !isSessionEnded && (
                  <SessionTimerBadge timer={timer} showAddTime />
                )}
              </div>
              {facilitatorInfo && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-400">Facilitated by</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 h-4">
                    {facilitatorInfo.title}
                  </Badge>
                </div>
              )}
            </div>

            {/* Session switcher */}
            {activeSessions.length > 1 && (
              <div className="shrink-0 hidden sm:block">
                <SessionsDropdown
                  currentSessionId={conversation?.id || null}
                  activeSessions={activeSessions}
                  isLoading={isLoading}
                  onRefresh={refreshSessions}
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 shrink-0">

            {/* QR Code */}
            {!isSessionEnded && (
              <HostQrDialog conversationId={conversation?.id || null} />
            )}

            {/* Analytics */}
            {conversation?.id && (
              <Button
                variant={analyticsOpen ? "default" : "ghost"}
                size="sm"
                className={`h-8 px-2.5 text-xs gap-1.5 ${analyticsOpen ? '' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
                onClick={() => setAnalyticsOpen(prev => !prev)}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Analytics</span>
              </Button>
            )}

            {/* Wrap Up */}
            {!isSessionEnded && isSessionStarted && (
              <HostWrapUpDialog
                onWrapUp={toggleSessionState}
                isWrappingUp={isSessionPaused}
              />
            )}

            {/* End Session button — opens the unified dialog */}
            {!isSessionEnded && isSessionStarted && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                onClick={handleOpenEndDialog}
                disabled={isBusy}
              >
                <Square className="h-3.5 w-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {isBusy ? 'Ending…' : 'End Session'}
                </span>
              </Button>
            )}

            {/* Locked / ended state placeholder */}
            {isSessionEnded && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5 text-slate-400 cursor-default"
                disabled
              >
                <Square className="h-3.5 w-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">Ended</span>
              </Button>
            )}

            {/* Reports button (only shown after session has ended and plan allows) */}
            {isSessionEnded && canGenerateReports && closureResult && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1.5 text-slate-600 hover:text-slate-900"
                onClick={() => setShowReportDialog(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">Report</span>
              </Button>
            )}

            {/* Upgrade prompt when plan doesn't allow reports */}
            {!canGenerateReports && !isSessionEnded && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs gap-1.5 text-slate-400 cursor-not-allowed"
                      disabled
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline whitespace-nowrap">Reports</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Upgrade your plan to access session reports.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Analytics panel (collapsible) */}
        {conversation?.id && analyticsOpen && (
          <div className="px-4 sm:px-5 pb-4 border-t border-slate-100 bg-slate-50">
            <div className="pt-4">
              <SessionAnalyticsDashboard
                conversationId={conversation.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Unified end-session dialog */}
      <SessionClosureDialog
        isOpen={showClosureDialog}
        onClose={() => setShowClosureDialog(false)}
        onStop={handleStop}
        onCloseAndReport={handleCloseAndReport}
        isClosing={isClosing}
        isStopping={isStopping}
        canGenerateReports={canGenerateReports}
        participantCount={conversation?.current_participants || 0}
        sessionTitle={getSessionTitle()}
        closureProgress={closureProgress}
      />

      {/* Report download dialog (shown after Close & Report) */}
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
