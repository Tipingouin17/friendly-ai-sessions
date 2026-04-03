/**
 * Host Wrap Up Dialog
 *
 * Session component for the AIfacilitator application.
 */

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
import { Pause, Play } from "lucide-react";

interface HostWrapUpDialogProps {
  onWrapUp: () => void;
  isWrappingUp: boolean;
}

const HostWrapUpDialog: React.FC<HostWrapUpDialogProps> = ({ 
  onWrapUp, 
  isWrappingUp 
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          {isWrappingUp ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          <span className="hidden sm:inline">
            {isWrappingUp ? "Resume" : "Pause"}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isWrappingUp ? "Resume Session" : "Pause Session"}
          </DialogTitle>
          <DialogDescription>
            {isWrappingUp 
              ? "Resume the session to allow participants to continue responding."
              : "Pause the session to prevent new participant responses while you review or prepare the next question."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-end space-x-2 pt-4">
          <Button 
            onClick={onWrapUp}
            variant={isWrappingUp ? "default" : "outline"}
          >
            {isWrappingUp ? "Resume Session" : "Pause Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HostWrapUpDialog;
