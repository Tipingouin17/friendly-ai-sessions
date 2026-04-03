/**
 * Report Download Dialog
 *
 * Session component for the AIfacilitator application.
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download, Users, MessageSquare, Clock, TrendingUp } from "lucide-react";

interface ReportDownloadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: (format: 'json' | 'text') => void;
  sessionData: {
    participantCount: number;
    messageCount: number;
    duration: number;
    engagementScore: number;
  };
  sessionTitle?: string;
  reportContent?: string;
}

const ReportDownloadDialog: React.FC<ReportDownloadDialogProps> = ({
  isOpen,
  onClose,
  onDownload,
  sessionData,
  sessionTitle = "Session",
  reportContent
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600" />
            <span>Session Report - {sessionTitle}</span>
          </DialogTitle>
          <DialogDescription>
            Your session has been successfully closed and a comprehensive report has been generated.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Session Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-sm text-gray-900 mb-3">Session Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>{sessionData.participantCount} Participants</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-green-500" />
                <span>{sessionData.messageCount} Messages</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>{sessionData.duration} Minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <span>{sessionData.engagementScore.toFixed(1)}/5.0 Engagement</span>
              </div>
            </div>
          </div>
          
          {/* Report Content */}
          {reportContent && (
            <div className="flex-1 min-h-0">
              <h3 className="font-medium text-sm text-gray-900 mb-2">Full Report</h3>
              <ScrollArea className="h-[400px] w-full border rounded-lg">
                <div className="p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                    {reportContent}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Download Options */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Download the report in your preferred format:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => onDownload('text')}
                className="flex items-center space-x-2"
              >
                <FileText className="h-4 w-4" />
                <span>Report (Text)</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => onDownload('json')}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Data (JSON)</span>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="default">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDownloadDialog;
