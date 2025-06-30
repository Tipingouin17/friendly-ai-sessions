
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download } from "lucide-react";

interface HostWrapUpDialogProps {
  onWrapUp: () => Promise<boolean>;
  isWrappingUp: boolean;
  onClose: () => void;
  onDownloadReport: (format?: 'json' | 'text') => void;
  conversationId: number | null;
  isDownloading: boolean;
}

const HostWrapUpDialog: React.FC<HostWrapUpDialogProps> = ({ 
  onWrapUp, 
  isWrappingUp,
  onClose,
  onDownloadReport,
  conversationId,
  isDownloading
}) => {
  const handleWrapUp = async () => {
    const success = await onWrapUp();
    if (success) {
      onClose();
    }
  };

  const handleDownload = (format: 'json' | 'text' = 'text') => {
    onDownloadReport(format);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>End Session & Generate Report</DialogTitle>
          <DialogDescription>
            This will close the session for all participants and generate a comprehensive session report.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 pt-4">
          <div className="flex justify-end space-x-2">
            <Button 
              variant="outline"
              onClick={onClose}
              disabled={isWrappingUp}
            >
              Cancel
            </Button>
            
            <Button 
              onClick={handleWrapUp}
              disabled={isWrappingUp || !conversationId}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              {isWrappingUp ? 'Ending Session...' : 'End Session & Get Report'}
            </Button>
          </div>

          {/* Download options after session ends */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Download report in different formats:</p>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('text')}
                disabled={isDownloading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Text Report
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload('json')}
                disabled={isDownloading}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                JSON Data
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostWrapUpDialog;
