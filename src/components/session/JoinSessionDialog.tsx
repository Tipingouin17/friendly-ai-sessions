
import React from 'react';
import { QrCode } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface JoinSessionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  joinUrl: string;
  currentParticipantCount: number;
  maxParticipants: number;
}

const JoinSessionDialog = ({
  isOpen,
  setIsOpen,
  joinUrl,
  currentParticipantCount,
  maxParticipants
}: JoinSessionDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="absolute top-4 right-14 z-10"
          onClick={() => setIsOpen(true)}
        >
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Session</DialogTitle>
          <DialogDescription>
            Share this link or QR code to invite others
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center">
          <QrCode 
            size={200}
            className="w-40 h-40 my-4"
            data-url={joinUrl}
          />
          <p className="text-sm text-center text-gray-500 mb-2">
            {joinUrl}
          </p>
          <p className="text-xs text-center text-gray-500">
            {currentParticipantCount} 
            {maxParticipants > 0 ? ` of ${maxParticipants}` : ''} participants
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinSessionDialog;
