
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SendHorizonal } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ParticipantInfo } from '@/types/chat';

interface AdminMessageInputProps {
  onSendMessage: (message: string, isPinned: boolean, recipientId?: string) => void;
  participants: ParticipantInfo[];
}

const AdminMessageInput: React.FC<AdminMessageInputProps> = ({
  onSendMessage,
  participants
}) => {
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<string>('all');

  const handleSend = () => {
    if (!message.trim()) return;
    
    const recipientId = recipient !== 'all' ? recipient : undefined;
    onSendMessage(message, false, recipientId);
    setMessage('');
  };

  return (
    <div className="p-4 border-t border-gray-200 bg-white">
      <div className="flex items-center mb-2">
        <Select value={recipient} onValueChange={setRecipient}>
          <SelectTrigger className="w-[180px] h-8 text-sm">
            <SelectValue placeholder="Send to everyone" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-md z-50">
            <SelectItem value="all">Everyone</SelectItem>
            {participants.map(participant => (
              <SelectItem 
                key={String(participant.id)} 
                value={String(participant.id)}
              >
                {participant.name || `Participant ${participant.id}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a message as facilitator..."
          className="min-h-[80px] resize-none"
        />
        <div className="flex flex-col justify-end">
          <Button 
            onClick={handleSend} 
            size="sm" 
            disabled={!message.trim()}
            className="px-3"
          >
            <SendHorizonal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {recipient === 'all' 
          ? 'This message will be sent to all participants' 
          : `This message will only be sent to ${participants.find(p => String(p.id) === recipient)?.name || 'the selected participant'}`
        }
      </div>
    </div>
  );
};

export default AdminMessageInput;
