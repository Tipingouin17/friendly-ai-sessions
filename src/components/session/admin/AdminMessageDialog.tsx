
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface AdminMessageDialogProps {
  onSendMessage: (message: string) => void;
}

const AdminMessageDialog: React.FC<AdminMessageDialogProps> = ({
  onSendMessage
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');

  const handleSendMessage = () => {
    if (adminMessage.trim()) {
      onSendMessage(adminMessage);
      setAdminMessage('');
      setIsOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          <span>Send Message</span>
        </Button>
      </DialogTrigger>
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
            onClick={() => setIsOpen(false)}
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
