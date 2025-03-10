
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminMessageDialogProps } from './types';

const AdminMessageDialog: React.FC<AdminMessageDialogProps> = ({
  isOpen,
  onOpenChange,
  onSendMessage
}) => {
  const [adminMessage, setAdminMessage] = useState('');

  const handleSendMessage = () => {
    if (adminMessage.trim()) {
      onSendMessage(adminMessage);
      setAdminMessage('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Message to Participants</DialogTitle>
          <DialogDescription>
            This message will appear as a notification for all participants.
          </DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <Textarea
            placeholder="Type your message here..."
            value={adminMessage}
            onChange={(e) => setAdminMessage(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleSendMessage} disabled={!adminMessage.trim()}>
            Send Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminMessageDialog;
