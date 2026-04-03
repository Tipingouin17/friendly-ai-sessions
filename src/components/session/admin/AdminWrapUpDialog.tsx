/**
 * Admin Wrap Up Dialog
 *
 * Session component for the AIfacilitator application.
 */

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface AdminWrapUpDialogProps {
  onWrapUp: () => void;
  isWrappingUp: boolean;
}

const AdminWrapUpDialog: React.FC<AdminWrapUpDialogProps> = ({
  onWrapUp,
  isWrappingUp
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    onWrapUp();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-2"
          disabled={isWrappingUp}
        >
          {isWrappingUp ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              <span>Wrapping up...</span>
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              <span>Wrap Up Session</span>
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wrap Up Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p>
            This will signal the AI facilitator to begin wrapping up the session by:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm text-gray-600">
            <li>Summarizing key discussion points</li>
            <li>Asking participants for final thoughts</li>
            <li>Guiding the conversation toward natural closure</li>
          </ul>
          <p className="text-sm text-gray-500">
            The session will continue but the AI will focus on concluding the discussion.
          </p>
          <div className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleConfirm}>
              Wrap Up Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminWrapUpDialog;
