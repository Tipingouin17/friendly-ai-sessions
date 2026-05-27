/**
 * Admin Message Input — Redesigned
 *
 * Compact host-to-participant message input with recipient selector.
 * Secondary to the AI Facilitator control but always accessible.
 */

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
    <div className="px-3 py-3 border-t border-slate-200 bg-white space-y-2">
      <Select value={recipient} onValueChange={setRecipient}>
        <SelectTrigger className="h-7 text-xs border-slate-200 bg-slate-50 text-slate-700">
          <SelectValue placeholder="Send to everyone" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-slate-200 shadow-lg rounded-lg z-50">
          <SelectItem value="all" className="text-xs">Everyone</SelectItem>
          {participants.map(p => (
            <SelectItem key={String(p.id)} value={String(p.id)} className="text-xs">
              {p.name || `Participant ${p.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2 items-end">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a message as facilitator…"
          className="min-h-[56px] max-h-[100px] resize-none text-xs border-slate-200 bg-slate-50 focus:bg-white placeholder:text-slate-400"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button
          onClick={handleSend}
          size="sm"
          disabled={!message.trim()}
          className="h-8 w-8 p-0 shrink-0 bg-indigo-600 hover:bg-indigo-700"
        >
          <SendHorizonal className="h-3.5 w-3.5" />
        </Button>
      </div>

    </div>
  );
};

export default AdminMessageInput;
