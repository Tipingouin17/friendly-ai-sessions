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
    <div className="space-y-3 bg-white px-5 py-4">
      <Select value={recipient} onValueChange={setRecipient}>
        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white px-4 text-base text-slate-700 shadow-sm">
          <SelectValue placeholder="Send to everyone" />
        </SelectTrigger>
        <SelectContent className="z-50 rounded-xl border border-slate-200 bg-white shadow-lg">
          <SelectItem value="all" className="text-sm">Everyone</SelectItem>
          {participants.map(p => (
            <SelectItem key={String(p.id)} value={String(p.id)} className="text-sm">
              {p.name || `Participant ${p.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-end gap-3">
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type a message as facilitator…"
          className="min-h-[72px] max-h-[128px] resize-none rounded-2xl border-slate-200 bg-white px-4 py-3 text-base text-slate-700 shadow-sm placeholder:text-slate-400 focus:bg-white"
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
          className="h-14 w-14 shrink-0 rounded-full bg-indigo-500 p-0 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-600 disabled:shadow-none"
        >
          <SendHorizonal className="h-6 w-6" />
        </Button>
      </div>

    </div>
  );
};

export default AdminMessageInput;
