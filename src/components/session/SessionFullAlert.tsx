
import React from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface SessionFullAlertProps {
  type?: 'full' | 'not-found' | 'error';
  message?: string;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const SessionFullAlert: React.FC<SessionFullAlertProps> = ({ 
  type = 'full',
  message,
  isModal = false,
  isOpen = true,
  onClose
}) => {
  const navigate = useNavigate();

  const handleReturn = () => {
    navigate("/");
    if (onClose) onClose();
  };

  const getAlertContent = () => {
    let title = "";
    let description = "";
    let alertClass = "border-amber-500 bg-amber-50 text-amber-900";
    
    switch (type) {
      case 'full':
        title = "Session Full";
        description = message || "This session is full (no more spots available)";
        alertClass = "border-amber-500 bg-amber-50 text-amber-900";
        break;
      case 'not-found':
        title = "Session Not Found";
        description = message || "The session you're trying to join doesn't exist or has been closed.";
        alertClass = "border-red-500 bg-red-50 text-red-900";
        break;
      case 'error':
        title = "Error Joining Session";
        description = message || "There was a problem joining this session. Please try again.";
        alertClass = "border-red-500 bg-red-50 text-red-900";
        break;
    }

    return (
      <>
        {title && isModal && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        )}
        
        {!isModal && (
          <Alert className={`mt-4 ${alertClass}`}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center">
              <span>{description}</span>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mt-4">
          <Button 
            onClick={handleReturn} 
            className="bg-[#FFC107] hover:bg-[#F5B800] text-black"
          >
            Return Home
          </Button>
        </div>
      </>
    );
  };

  if (isModal) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose ? () => onClose() : undefined}>
        <DialogContent>
          {getAlertContent()}
        </DialogContent>
      </Dialog>
    );
  }

  return getAlertContent();
};

export default SessionFullAlert;
