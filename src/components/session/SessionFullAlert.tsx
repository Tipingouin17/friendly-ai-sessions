/**
 * Session Full Alert
 *
 * Session component for the AIfacilitator application.
 */
import React, { useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSessionAdminStatus } from "@/hooks/useSessionAdminStatus";

interface SessionFullAlertProps {
  type?: 'full' | 'not-found' | 'error';
  message?: string;
  isModal?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isAdmin?: boolean;
}

const SessionFullAlert: React.FC<SessionFullAlertProps> = ({ 
  type = 'full',
  message,
  isModal = false,
  isOpen = true,
  onClose,
  isAdmin: propIsAdmin
}) => {
  const navigate = useNavigate();
  
  // Check all possible sources of admin status
  const { isAdmin: contextIsAdmin } = useSessionAdminStatus();
  const storedIsAdmin = sessionStorage.getItem('isAdminSession') === 'true';
  const isAdmin = propIsAdmin || contextIsAdmin || storedIsAdmin;

  // Skip showing session full alert for admin users immediately
  useEffect(() => {
    if (isAdmin && type === 'full' && onClose) {
      onClose();
    }
  }, [isAdmin, type, onClose]);

  // If we're an admin and this is a full session alert, don't render anything
  if (isAdmin && type === 'full') {
    return null;
  }

  const handleReturn = () => {
    navigate("/");
    if (onClose) onClose();
  };

  const handleRetry = () => {
    // For admin users we'll force a hard refresh
    if (isAdmin) {
      window.location.reload();
    } else {
      // For regular users just do a normal refresh
      window.location.reload();
    }
    if (onClose) onClose();
  };

  const getAlertContent = () => {
    let title = "";
    let description = "";
    let alertClass = "border-indigo-500 bg-indigo-50 text-indigo-900";
    
    switch (type) {
      case 'full':
        title = "Session Full";
        description = message || "This session is full and cannot accept more participants.";
        alertClass = "border-indigo-500 bg-indigo-50 text-indigo-900";
        break;
      case 'not-found':
        title = "Session Not Found";
        description = message || "The session you're trying to join doesn't exist or has been closed.";
        alertClass = "border-red-500 bg-red-50 text-red-900";
        break;
      case 'error':
        title = "Session Error";
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
            onClick={handleRetry} 
            className="bg-indigo-600 hover:bg-indigo-700 text-black mb-2 w-full"
          >
            Retry Connection
          </Button>
          
          <Button 
            onClick={handleReturn} 
            variant="outline"
            className="w-full"
          >
            Return Home
          </Button>
        </div>
      </>
    );
  };

  // Don't render anything for admin users with session full
  if (isAdmin && type === 'full') {
    return null;
  }

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
