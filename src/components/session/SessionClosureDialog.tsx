/**
 * Session Closure Dialog
 *
 * Offers the host two ways to end a session:
 *  - Stop Session: ends immediately, no AI report generated.
 *  - Close & Report: ends the session AND generates an AI summary report.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Square, Users, MessageSquare, Clock, AlertTriangle, Lock } from "lucide-react";

interface SessionClosureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called when the host chooses to stop without a report */
  onStop: () => void;
  /** Called when the host chooses to close and generate a report */
  onCloseAndReport: () => void;
  isClosing: boolean;
  isStopping: boolean;
  /** Whether the current plan allows report generation */
  canGenerateReports: boolean;
  participantCount: number;
  sessionTitle?: string;
  closureProgress?: string;
}

const SessionClosureDialog: React.FC<SessionClosureDialogProps> = ({
  isOpen,
  onClose,
  onStop,
  onCloseAndReport,
  isClosing,
  isStopping,
  canGenerateReports,
  participantCount,
  sessionTitle = "this session",
  closureProgress = "",
}) => {
  const isBusy = isClosing || isStopping;

  return (
    <Dialog open={isOpen} onOpenChange={isBusy ? undefined : onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <DialogTitle>End Session</DialogTitle>
          </div>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1">
              <p>
                You are about to end <strong>{sessionTitle}</strong>. Choose how you want to close it:
              </p>

              {/* Common effects */}
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>Ends the session for all {participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>Prevents further messages from being sent</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span>Redirects participants to the home page</span>
                </li>
              </ul>

              {closureProgress && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-green-800">{closureProgress}</span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          {/* Cancel */}
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isBusy}
            className="sm:mr-auto"
          >
            Cancel
          </Button>

          {/* Stop — no report */}
          <Button
            variant="outline"
            onClick={onStop}
            disabled={isBusy}
            className="border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5"
          >
            {isStopping ? (
              <>
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-slate-600" />
                {closureProgress || "Stopping…"}
              </>
            ) : (
              <>
                <Square className="h-3.5 w-3.5" />
                Stop Session
              </>
            )}
          </Button>

          {/* Close & Report */}
          {canGenerateReports ? (
            <Button
              variant="default"
              onClick={onCloseAndReport}
              disabled={isBusy}
              className="bg-orange-600 hover:bg-orange-700 gap-1.5"
            >
              {isClosing ? (
                <>
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                  {closureProgress || "Closing…"}
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" />
                  Close &amp; Report
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="outline"
              disabled
              className="gap-1.5 text-slate-400 border-slate-200 cursor-not-allowed"
              title="Upgrade your plan to access session reports"
            >
              <Lock className="h-3.5 w-3.5" />
              Close &amp; Report
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionClosureDialog;
