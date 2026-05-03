/**
 * Host Header — Mobile-first redesign
 *
 * Mobile  (<sm): two rows
 *   Row 1: [back] | [title + status badge]          [action icons]
 *   Row 2: [facilitator badge]  [timer]
 *
 * Tablet+ (sm+): single compact row — same as before.
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Lock,
  ChevronLeft,
  Square,
} from "lucide-react";
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { useToast } from "@/components/ui/use-toast";
import { useSessionTimer } from "@/hooks/useSessionTimer";
import SessionTimerBadge from "../SessionTimerBadge";
import { getFacilitatorAvatarUrl } from "@/utils/facilitatorUtils";

interface HostHeaderProps {
  conversation: ConversationWithSession | null;
  isSessionPaused: boolean;
  toggleSessionState: () => void;
}

const HostHeader: React.FC<HostHeaderProps> = ({
  conversation,
  isSessionPaused,
  toggleSessionState,
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
    downloadReport,
  } = useSessionClosure();
  const { canGenerateReports } = usePlanLimits();

  const [showClosureDialog, setShowClosureDialog] = useState(false);
  const timer = useSessionTimer(conversation, true);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const handleBack = () => {
    try {
      navigate("/past-workshops", { replace: true });
    } catch {
      window.location.href = "/past-workshops";
    }
  };

  const handleStop = async () => {
    if (!conversation?.id) return;
    await stopSessionWithoutReport(conversation.id);
    // Always close the dialog after the attempt (success or failure)
    // On failure, the error toast is shown by stopSessionWithoutReport
    setShowClosureDialog(false);
  };

  const handleCloseAndReport = async () => {
    if (!conversation?.id) return;
    const success = await closeSessionAndGenerateReport(conversation.id);
    // Always close the dialog after the attempt
    setShowClosureDialog(false);
    if (success && canGenerateReports) setShowReportDialog(true);
  };

  const handleOpenEndDialog = () => {
    if (!conversation?.id || conversation.is_session_ended) return;
    setShowClosureDialog(true);
  };

  const getSessionTitle = () =>
    conversation?.sessions?.title || (conversation ? "Untitled Session" : "Loading…");

  const facilitatorInfo = conversation?.sessions?.facilitator_details ?? null;
  const [facilitatorAvatarUrl, setFacilitatorAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!facilitatorInfo) { setFacilitatorAvatarUrl(null); return; }
    getFacilitatorAvatarUrl(facilitatorInfo).then(url => {
      setFacilitatorAvatarUrl(url && url !== '/placeholder.svg' ? url : null);
    }).catch(() => setFacilitatorAvatarUrl(null));
  }, [facilitatorInfo?.profile_picture, facilitatorInfo?.id]);

  const isSessionEnded = conversation?.is_session_ended || false;
  const isSessionStarted = conversation?.session_started || false;
  const isBusy = isClosing || isStopping;

  /* ── Action buttons (shared between layouts) ── */
  const actionButtons = (
    <div className="flex items-center gap-1 shrink-0">
      {/* QR Code */}
      {!isSessionEnded && (
        <HostQrDialog conversationId={conversation?.id || null} joinToken={(conversation as any)?.join_token || null} />
      )}

      {/* Analytics */}
      {conversation?.id && (
        <Button
          variant={analyticsOpen ? "default" : "ghost"}
          size="sm"
          className={`h-8 w-8 sm:w-auto sm:px-2.5 p-0 text-xs gap-1.5 ${
            analyticsOpen
              ? ""
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
          onClick={() => setAnalyticsOpen((prev) => !prev)}
          title="Analytics"
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

      {/* End Session */}
      {!isSessionEnded && isSessionStarted && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 sm:w-auto sm:px-2.5 p-0 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          onClick={handleOpenEndDialog}
          disabled={isBusy}
          title={isBusy ? "Ending…" : "End Session"}
        >
          <Square className="h-3.5 w-3.5" />
          <span className="hidden sm:inline whitespace-nowrap">
            {isBusy ? "Ending…" : "End Session"}
          </span>
        </Button>
      )}

      {/* Ended placeholder */}
      {isSessionEnded && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 sm:w-auto sm:px-2.5 p-0 text-xs gap-1.5 text-slate-400 cursor-default"
          disabled
          title="Session ended"
        >
          <Square className="h-3.5 w-3.5" />
          <span className="hidden sm:inline whitespace-nowrap">Ended</span>
        </Button>
      )}

      {/* Report (after ended + plan allows) */}
      {isSessionEnded && canGenerateReports && closureResult && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 sm:w-auto sm:px-2.5 p-0 text-xs gap-1.5 text-slate-600 hover:text-slate-900"
          onClick={() => setShowReportDialog(true)}
          title="Download report"
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline whitespace-nowrap">Report</span>
        </Button>
      )}

      {/* Locked reports */}
      {!canGenerateReports && !isSessionEnded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 sm:w-auto sm:px-2.5 p-0 text-xs gap-1.5 text-slate-400 cursor-not-allowed"
                disabled
                title="Reports locked"
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
  );

  return (
    <>
      {/* ── Main header bar ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">

        {/* ── Single row on sm+ / two rows on mobile ── */}
        <div className="px-3 sm:px-5">

          {/* Row 1: back | title + status | actions */}
          <div className="flex items-center gap-2 h-12 sm:h-14">

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

            {/* Title + status badge (+ facilitator row on sm+) */}
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm font-semibold text-slate-900 truncate leading-tight">
                  {getSessionTitle()}
                </h1>
                <SessionStatusBadge
                  isActive={!isSessionPaused && !isSessionEnded && isSessionStarted}
                  sessionStarted={isSessionStarted}
                />
                {isSessionStarted && !isSessionEnded && (
                  <span className="hidden sm:flex">
                    <SessionTimerBadge timer={timer} showAddTime />
                  </span>
                )}
              </div>

              {/* Facilitator + timer sub-row — visible on sm+ inline, hidden on mobile (shown in row 2) */}
              {facilitatorInfo && (
                <div className="hidden sm:flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-slate-400">Facilitated by</span>
                  <div className="flex items-center gap-1">
                    {facilitatorAvatarUrl && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={facilitatorAvatarUrl} alt={facilitatorInfo.title ?? ''} />
                        <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700">
                          {(facilitatorInfo.title || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 h-4"
                    >
                      {facilitatorInfo.title}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Session switcher (tablet+) */}
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

            {/* Action buttons */}
            {actionButtons}
          </div>

          {/* Row 2 (mobile only): facilitator badge + timer */}
          {(facilitatorInfo || (isSessionStarted && !isSessionEnded)) && (
            <div className="flex sm:hidden items-center gap-2 pb-2 -mt-1">
              {facilitatorInfo && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-400">by</span>
                  {facilitatorAvatarUrl && (
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={facilitatorAvatarUrl} alt={facilitatorInfo.title ?? ''} />
                      <AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-700">
                        {(facilitatorInfo.title || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 h-4"
                  >
                    {facilitatorInfo.title}
                  </Badge>
                </div>
              )}
              {isSessionStarted && !isSessionEnded && (
                <SessionTimerBadge timer={timer} showAddTime />
              )}
            </div>
          )}
        </div>

        {/* Analytics panel (collapsible) */}
        {conversation?.id && analyticsOpen && (
          <div className="px-3 sm:px-5 pb-4 border-t border-slate-100 bg-slate-50">
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

      {/* Report download dialog */}
      <ReportDownloadDialog
        isOpen={showReportDialog}
        onClose={() => setShowReportDialog(false)}
        onDownload={(format) => {
          downloadReport(format);
          setShowReportDialog(false);
        }}
        sessionData={
          closureResult?.sessionData || {
            participantCount: 0,
            messageCount: 0,
            duration: 0,
            engagementScore: 0,
          }
        }
        sessionTitle={getSessionTitle()}
      />
    </>
  );
};

export default HostHeader;
