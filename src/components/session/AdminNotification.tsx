
import React, { useState, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageSquare } from 'lucide-react';

interface AdminNotificationProps {
  message: string | null;
  onClose: () => void;
}

const AdminNotification: React.FC<AdminNotificationProps> = ({
  message,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (message) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [message]);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Message from Facilitator
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base mt-2 whitespace-pre-wrap">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleClose}>
            Acknowledge
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AdminNotification;
