/**
 * Session Closure Dialog
 *
 * A single, clean modal that lets the host choose how to end a session:
 *  - Stop Session  : ends immediately, no report.
 *  - Close & Report: ends the session AND generates an AI summary report.
 *
 * Design goals
 *  • One modal, no nested dialogs.
 *  • Action cards instead of plain buttons so the choice is visually obvious.
 *  • A progress bar + status message while the backend is working.
 *  • No text truncation in any state.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Square, Users, MessageSquare, Clock, AlertTriangle, Lock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionClosureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStop: () => void;
  onCloseAndReport: () => void;
  isClosing: boolean;
  isStopping: boolean;
  canGenerateReports: boolean;
  participantCount: number;
  sessionTitle?: string;
  /** Short status message shown in the progress area, e.g. "Generating report…" */
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
      <DialogContent className="max-w-lg">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <DialogTitle className="text-lg">End Session</DialogTitle>
          </div>
          <p className="text-sm text-slate-600 pt-1">
            You are about to end <strong>{sessionTitle}</strong>. This will:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-slate-500">
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              End the session for all {participantCount} participant{participantCount !== 1 ? 's' : ''}
            </li>
            <li className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Prevent further messages from being sent
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Redirect participants to the home page
            </li>
          </ul>
        </DialogHeader>

        {/* ── Progress area (visible only while busy) ── */}
        {isBusy && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-green-600 animate-spin shrink-0" />
            <span className="text-sm text-green-800">
              {closureProgress || (isClosing ? "Closing session and generating report…" : "Stopping session…")}
            </span>
          </div>
        )}

        {/* ── Action cards ── */}
        {!isBusy && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Stop Session card */}
            <button
              onClick={onStop}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border-2 border-slate-200 bg-white p-4 text-left",
                "hover:border-slate-400 hover:bg-slate-50 transition-colors"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-slate-100 p-1.5 group-hover:bg-slate-200 transition-colors">
                  <Square className="h-4 w-4 text-slate-600" />
                </div>
                <span className="font-semibold text-slate-800">Stop Session</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                End the session immediately. No report will be generated. Useful when you just want to close quickly.
              </p>
            </button>

            {/* Close & Report card */}
            {canGenerateReports ? (
              <button
                onClick={onCloseAndReport}
                className={cn(
                  "group flex flex-col gap-2 rounded-xl border-2 border-orange-200 bg-orange-50 p-4 text-left",
                  "hover:border-orange-400 hover:bg-orange-100 transition-colors"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-orange-100 p-1.5 group-hover:bg-orange-200 transition-colors">
                    <FileText className="h-4 w-4 text-orange-600" />
                  </div>
                  <span className="font-semibold text-orange-800">Close &amp; Report</span>
                </div>
                <p className="text-xs text-orange-700 leading-relaxed">
                  End the session and generate an AI-powered summary report with key insights and participant responses.
                </p>
              </button>
            ) : (
              <div
                className="flex flex-col gap-2 rounded-xl border-2 border-slate-100 bg-slate-50 p-4 cursor-not-allowed opacity-60"
                title="Upgrade your plan to access session reports"
              >
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-slate-100 p-1.5">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <span className="font-semibold text-slate-400">Close &amp; Report</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Upgrade to Starter or higher to unlock AI-powered session reports.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer: Cancel (only when not busy) ── */}
        {!isBusy && (
          <div className="flex justify-end pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-500">
              Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SessionClosureDialog;
