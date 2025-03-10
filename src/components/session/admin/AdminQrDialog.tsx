
import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { AdminQrDialogProps } from './types';

const AdminQrDialog: React.FC<AdminQrDialogProps> = ({
  isOpen,
  onOpenChange,
  joinUrl,
  currentParticipants,
  maxParticipants,
  onCopyLink
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-6">
          {joinUrl && (
            <>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`} 
                  alt="Session QR Code" 
                  className="w-48 h-48"
                />
              </div>
              <div className="flex w-full items-center mt-2 bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                <input 
                  type="text" 
                  value={joinUrl} 
                  readOnly 
                  className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:outline-none"
                />
                <Button 
                  variant="ghost" 
                  className="h-full rounded-l-none border-l" 
                  onClick={onCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
          <div className="mt-4 text-sm text-gray-600 text-center">
            <p className="font-medium">Current participants: {currentParticipants}/{maxParticipants}</p>
            <p className="mt-1">Share this QR code or link with participants to join the session</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminQrDialog;
