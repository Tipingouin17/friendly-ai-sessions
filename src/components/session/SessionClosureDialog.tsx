/**
 * Session Closure Dialog
 *
 * Session component for the AIfacilitator application.
 */

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, AlertTriangle, Users, MessageSquare, Clock } from "lucide-react";

interface SessionClosureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isClosing: boolean;
  participantCount: number;
  sessionTitle?: string;
  closureProgress?: string;
}

const SessionClosureDialog: React.FC<SessionClosureDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isClosing,
  participantCount,
  sessionTitle = "this session",
  closureProgress = ""
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <AlertDialogTitle>Close Session & Generate Report</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <span>
                Are you sure you want to close <strong>{sessionTitle}</strong>? This action will:
              </span>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li className="flex items-center space-x-2">
                  <Users className="h-3 w-3 flex-shrink-0" />
                  <span>End the session for all {participantCount} participants</span>
                </li>
                <li className="flex items-center space-x-2">
                  <FileText className="h-3 w-3 flex-shrink-0" />
                  <span>Generate a comprehensive session report</span>
                </li>
                <li className="flex items-center space-x-2">
                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  <span>Prevent further messages from being sent</span>
                </li>
                <li className="flex items-center space-x-2">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>Redirect participants to the home page</span>
                </li>
              </ul>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm text-blue-800">
                  <FileText className="h-4 w-4 inline mr-1" />
                  The report will include participation statistics, key discussion points, and session analytics.
                </span>
              </div>
              {closureProgress && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm text-green-800">
                    {closureProgress}
                  </span>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isClosing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isClosing}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isClosing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {closureProgress || "Closing Session..."}
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Close & Generate Report
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SessionClosureDialog;
