
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Square, Download, Loader2 } from "lucide-react";

interface HostWrapUpDialogProps {
  conversationId: number | null;
  onClose: () => void;
  onCloseSession: () => Promise<boolean>;
  onDownloadReport: (format?: 'json' | 'text') => void;
  isClosing: boolean;
  isDownloading: boolean;
}

const HostWrapUpDialog: React.FC<HostWrapUpDialogProps> = ({ 
  conversationId,
  onClose,
  onCloseSession,
  onDownloadReport,
  isClosing,
  isDownloading
}) => {
  const handleCloseSession = async () => {
    const success = await onCloseSession();
    if (success) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Square className="h-5 w-5 text-red-600" />
            End Session
          </DialogTitle>
          <DialogDescription>
            This will close the session and generate a final report. Participants will no longer be able to respond.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 pt-4">
          <div className="flex justify-between space-x-3">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isClosing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCloseSession}
              disabled={isClosing}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  End Session
                </>
              )}
            </Button>
          </div>
          
          {/* Download options will be shown after session is closed */}
          <div className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => onDownloadReport('text')}
              disabled={isDownloading || isClosing}
              className="w-full"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostWrapUpDialog;
