
import React, { useRef, useEffect } from 'react';
import { Mic, Send, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { SpeechRecognition } from "@/types/chat";

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  onSendMessage: () => void;
  isRecording?: boolean;
  setIsRecording?: (isRecording: boolean) => void;
  placeholder?: string;
}

const ChatInput = ({
  inputMessage,
  setInputMessage,
  onSendMessage,
  isRecording,
  setIsRecording
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');
          setInputMessage(transcript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
          toast({
            title: "Error",
            description: "There was an error with speech recognition. Please try again.",
            variant: "destructive",
          });
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [setInputMessage, setIsRecording]);

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Recording started",
        description: "Your voice is being recorded...",
      });
    } else {
      toast({
        title: "Speech Recognition Not Available",
        description: "Your browser doesn't support speech recognition.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    toast({
      title: "Recording stopped",
      description: "Processing your message...",
    });
  };

  return (
    <div className="p-6 border-t border-gray-100">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message here..."
          className="min-h-[80px] pr-24"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
        />
        <div className="absolute bottom-2 right-2 flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`h-8 w-8 ${isRecording ? "text-red-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            {isRecording ? <StopCircle className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button
            onClick={onSendMessage}
            size="icon"
            disabled={!inputMessage.trim()}
            className="h-8 w-8"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
