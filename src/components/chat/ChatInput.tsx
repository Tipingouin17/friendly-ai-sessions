
import React from 'react';
import { Mic, Send, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording: boolean;
  setIsRecording: (isRecording: boolean) => void;
}

const ChatInput = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording
}: ChatInputProps) => {
  const handleStartRecording = () => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Speak now...",
      });
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 bg-white">
      <div className="relative">
        <Textarea
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message here..."
          className="pr-24 min-h-[80px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? () => setIsRecording(false) : handleStartRecording}
            className={isRecording ? "text-red-500" : ""}
          >
            {isRecording ? <StopCircle /> : <Mic />}
          </Button>
          <Button
            size="icon"
            onClick={onSendMessage}
            disabled={!inputMessage.trim()}
            className="bg-[#FFC107] hover:bg-[#FFB000]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
